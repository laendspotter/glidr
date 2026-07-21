// V2-FEATURE: Thermik-Erkennung bei anderen Fliegern + Erreichbarkeits-Push
//
// Status: Grundgerüst, noch nicht ins UI eingehängt. Läuft rein auf Basis von
// OGN/FLARM-Telemetrie anderer Flieger (kein eigenes Vario nötig, da xcvario-Projekt
// eingestellt wurde).
//
// Logik:
// 1. Für jeden anderen Flieger in der Nähe: Heading-Historie über Zeit tracken
// 2. Wenn Heading mehrfach volle 360°-Drehungen macht (Summe der Delta-Winkel > 3*360°)
//    innerhalb eines kurzen Zeitfensters -> gilt als "kreist" = Thermik-Indikator
// 3. Climb-Rate kommt aus der OGN-Telemetrie des anderen Fliegers (vspeed-Feld)
// 4. Gleitzahl-Check: kann man von der eigenen Position aus die Thermik-Höhe
//    überhaupt erreichen? (eigene Höhe - Thermik-Höhe) / Distanz muss über der
//    Gleitzahl der eigenen Polare liegen (mit Sicherheitsmarge)
// 5. Wenn ja -> Push mit Heading + Distanz + m/s

import type { OgnAircraft } from './ognTracking';

interface HeadingSample {
  headingDeg: number;
  timestamp: number;
}

interface TrackedAircraft {
  registration: string;
  headingHistory: HeadingSample[];
  lastKnownPosition: { lat: number; lng: number; altM: number };
  lastClimbRateMs: number;
}

const trackedAircraft = new Map<string, TrackedAircraft>();
const CIRCLE_WINDOW_MS = 90 * 1000; // 90s fenster für kreis-erkennung
const MIN_CUMULATIVE_TURN_DEG = 3 * 360; // mind. 3 volle kreise

export function updateAircraftHeading(aircraft: OgnAircraft): void {
  const existing = trackedAircraft.get(aircraft.registration);
  const now = Date.now();

  const sample: HeadingSample = { headingDeg: aircraft.headingDeg, timestamp: now };

  if (!existing) {
    trackedAircraft.set(aircraft.registration, {
      registration: aircraft.registration,
      headingHistory: [sample],
      lastKnownPosition: { lat: aircraft.lat, lng: aircraft.lng, altM: aircraft.altM },
      lastClimbRateMs: aircraft.climbRateMs,
    });
    return;
  }

  existing.headingHistory.push(sample);
  existing.headingHistory = existing.headingHistory.filter((s) => now - s.timestamp < CIRCLE_WINDOW_MS);
  existing.lastKnownPosition = { lat: aircraft.lat, lng: aircraft.lng, altM: aircraft.altM };
  existing.lastClimbRateMs = aircraft.climbRateMs;
}

// summiert die absoluten heading-deltas über das zeitfenster, um kreis-anzahl zu schätzen
function cumulativeTurnDeg(history: HeadingSample[]): number {
  let total = 0;
  for (let i = 1; i < history.length; i++) {
    let delta = history[i].headingDeg - history[i - 1].headingDeg;
    // winkel-wrap behandeln (z.b. 350° -> 10° ist +20°, nicht -340°)
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    total += Math.abs(delta);
  }
  return total;
}

export function isCircling(registration: string): boolean {
  const tracked = trackedAircraft.get(registration);
  if (!tracked || tracked.headingHistory.length < 5) return false;
  return cumulativeTurnDeg(tracked.headingHistory) >= MIN_CUMULATIVE_TURN_DEG;
}

// vereinfachte gleitzahl-tabelle für gängige schulungs-/vereinsglider,
// erweiterbar pro glider-typ falls das profil den typ kennt
const DEFAULT_GLIDE_RATIO = 30; // konservative annahme (ASK21 liegt bei ~28-30)
const SAFETY_MARGIN_FACTOR = 0.8; // 20% sicherheitsmarge, damit's nicht knapp wird

export interface ThermalOpportunity {
  registration: string;
  headingDeg: number;
  distanceKm: number;
  climbRateMs: number;
  reachable: boolean;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// prüft für alle aktuell kreisenden flieger, ob die eigene position sie erreichen kann
export function findReachableThermals(
  ownLat: number,
  ownLng: number,
  ownAltM: number,
  glideRatio = DEFAULT_GLIDE_RATIO
): ThermalOpportunity[] {
  const opportunities: ThermalOpportunity[] = [];

  for (const [registration, tracked] of trackedAircraft.entries()) {
    if (!isCircling(registration)) continue;

    const { lat, lng, altM } = tracked.lastKnownPosition;
    const distanceKm = haversineKm(ownLat, ownLng, lat, lng);
    const heightDiffM = ownAltM - altM;

    // erreichbare gleitstrecke bei aktueller höhe (mit sicherheitsmarge)
    const maxGlideDistanceKm = (heightDiffM * glideRatio * SAFETY_MARGIN_FACTOR) / 1000;
    const reachable = heightDiffM > 0 && distanceKm <= maxGlideDistanceKm;

    opportunities.push({
      registration,
      headingDeg: bearingDeg(ownLat, ownLng, lat, lng),
      distanceKm,
      climbRateMs: tracked.lastClimbRateMs,
      reachable,
    });
  }

  return opportunities;
}

// aufräumen alter tracking-einträge (flieger die schon lange nicht mehr gesehen wurden)
export function pruneStaleAircraft(maxAgeMs = 5 * 60 * 1000): void {
  const now = Date.now();
  for (const [registration, tracked] of trackedAircraft.entries()) {
    const lastSample = tracked.headingHistory[tracked.headingHistory.length - 1];
    if (!lastSample || now - lastSample.timestamp > maxAgeMs) {
      trackedAircraft.delete(registration);
    }
  }
}
