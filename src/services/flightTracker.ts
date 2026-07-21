import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { pollOgnForRegistration, isLikelyAirborne, isLikelyOnGround, type OgnAircraft } from './ognTracking';
import { requestLocationPermissions, startGpsTracking, stopGpsTracking, simplifyTrack, calculateDistanceKm } from './gpsTracking';
import { findNearestAirfield } from './airfields';
import type { TrackPoint, Flight } from '../types/models';

type FlightState = 'idle' | 'watching' | 'airborne' | 'landed';

interface TrackerContext {
  uid: string;
  displayName: string;
  gliderRegistration: string;
  onStateChange?: (state: FlightState) => void;
}

let state: FlightState = 'idle';
let ognPollInterval: ReturnType<typeof setInterval> | null = null;
let altHistory: number[] = [];
let trackPoints: TrackPoint[] = [];
let currentFlightId: string | null = null;
let startTime: number | null = null;
let startAirfieldName: string | null = null;

// wird aufgerufen wenn der user auf "bereit zum fliegen" tippt (z.b. am flugplatz)
// pollt OGN alle 15s nach der eigenen kennung, bis ein start erkannt wird
export function startWatchingForTakeoff(ctx: TrackerContext): void {
  if (state !== 'idle') return;
  state = 'watching';
  ctx.onStateChange?.(state);

  ognPollInterval = setInterval(async () => {
    const aircraft = await pollOgnForRegistration(ctx.gliderRegistration);
    if (!aircraft) return;

    const lastAlt = altHistory.length > 0 ? altHistory[altHistory.length - 1] : null;

    if (state === 'watching' && isLikelyAirborne(aircraft, lastAlt)) {
      await handleTakeoffDetected(ctx, aircraft);
    }

    altHistory.push(aircraft.altM);
    if (altHistory.length > 10) altHistory.shift();
  }, 15000);
}

async function handleTakeoffDetected(ctx: TrackerContext, aircraft: OgnAircraft): Promise<void> {
  state = 'airborne';
  ctx.onStateChange?.(state);
  startTime = Date.now();
  currentFlightId = `${ctx.uid}_${startTime}`;
  trackPoints = [];

  // startflugplatz aus koordinaten ermitteln, läuft im hintergrund weiter
  findNearestAirfield(aircraft.lat, aircraft.lng).then((field) => {
    startAirfieldName = field?.name ?? null;
  });

  // GPS als genauigkeits-layer dazuschalten
  const hasGpsPermission = await requestLocationPermissions();
  if (hasGpsPermission) {
    startGpsTracking((point) => {
      trackPoints.push(point);
      pushLivePosition(ctx, point, aircraft.headingDeg, aircraft.climbRateMs);
    });
  }

  // initiale live-position sofort schreiben, auch ohne ersten GPS-fix
  pushLivePosition(
    ctx,
    { lat: aircraft.lat, lng: aircraft.lng, altM: aircraft.altM, timestamp: Date.now() },
    aircraft.headingDeg,
    aircraft.climbRateMs
  );

  // parallel weiter OGN pollen für landing-erkennung als fallback
  if (ognPollInterval) clearInterval(ognPollInterval);
  ognPollInterval = setInterval(async () => {
    const current = await pollOgnForRegistration(ctx.gliderRegistration);
    if (!current) {
      // kein OGN-signal mehr -> vermutlich außer reichweite oder gelandet
      await handleLandingDetected(ctx);
      return;
    }
    altHistory.push(current.altM);
    if (altHistory.length > 10) altHistory.shift();

    if (isLikelyOnGround(current, altHistory)) {
      await handleLandingDetected(ctx);
    }
  }, 15000);
}

async function pushLivePosition(
  ctx: TrackerContext,
  point: TrackPoint,
  headingDeg: number,
  climbRateMs: number | null
): Promise<void> {
  if (!currentFlightId) return;
  await setDoc(doc(db, 'liveTracks', ctx.uid), {
    uid: ctx.uid,
    displayName: ctx.displayName,
    gliderRegistration: ctx.gliderRegistration,
    lat: point.lat,
    lng: point.lng,
    altM: point.altM,
    headingDeg,
    climbRateMs,
    updatedAt: Date.now(),
    flightId: currentFlightId,
  });
}

async function handleLandingDetected(ctx: TrackerContext): Promise<void> {
  if (state !== 'airborne' || !currentFlightId || !startTime) return;
  state = 'landed';
  ctx.onStateChange?.(state);

  stopGpsTracking();
  if (ognPollInterval) clearInterval(ognPollInterval);
  ognPollInterval = null;

  const simplified = simplifyTrack(trackPoints);
  const distanceKm = calculateDistanceKm(trackPoints);
  const maxAltitudeM = trackPoints.reduce((max, p) => Math.max(max, p.altM), 0);
  const durationSec = Math.round((Date.now() - startTime) / 1000);
  const avgSpeedKmh = durationSec > 0 ? (distanceKm / (durationSec / 3600)) : 0;

  // landeplatz aus letztem bekannten trackpoint ermitteln (fallback: gleicher wie start)
  const lastPoint = trackPoints[trackPoints.length - 1];
  const landingField = lastPoint
    ? await findNearestAirfield(lastPoint.lat, lastPoint.lng).catch(() => null)
    : null;

  const flight: Omit<Flight, 'id'> = {
    uid: ctx.uid,
    status: 'processing',
    gliderRegistration: ctx.gliderRegistration,
    startTime,
    endTime: Date.now(),
    distanceKm,
    maxAltitudeM,
    durationSec,
    avgSpeedKmh,
    trackPoints: simplified,
    startAirfield: startAirfieldName,
    landingAirfield: landingField?.name ?? startAirfieldName,
    dataSource: trackPoints.length > 0 ? 'hybrid' : 'ogn',
    weglideFlightId: null,
    olcPoints: null,
  };

  await setDoc(doc(db, 'flights', currentFlightId), flight);
  await deleteDoc(doc(db, 'liveTracks', ctx.uid));

  // aufräumen für nächsten flug
  state = 'idle';
  trackPoints = [];
  altHistory = [];
  startAirfieldName = null;
  const finishedFlightId = currentFlightId;
  currentFlightId = null;
  startTime = null;

  return; // finishedFlightId wird über callback/state im UI abgeholt (siehe hook)
}

export function stopWatching(): void {
  if (ognPollInterval) clearInterval(ognPollInterval);
  ognPollInterval = null;
  stopGpsTracking();
  state = 'idle';
}

export function getCurrentState(): FlightState {
  return state;
}
