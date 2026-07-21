import * as Location from 'expo-location';
import type { TrackPoint } from '../types/models';

let watchSubscription: Location.LocationSubscription | null = null;

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  // hintergrund-tracking nötig, damit der flug weiterläuft wenn das handy
  // in der tasche/halterung ist und der screen aus ist
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return bgStatus === 'granted';
}

export function startGpsTracking(onUpdate: (point: TrackPoint) => void): void {
  if (watchSubscription) return; // schon aktiv

  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000, // alle 5s reicht für segelflug, spart akku
      distanceInterval: 20, // oder alle 20m, je nachdem was zuerst eintritt
    },
    (loc) => {
      onUpdate({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        altM: loc.coords.altitude ?? 0,
        timestamp: loc.timestamp,
      });
    }
  ).then((sub) => {
    watchSubscription = sub;
  });
}

export function stopGpsTracking(): void {
  watchSubscription?.remove();
  watchSubscription = null;
}

// vereinfacht eine rohe trackpoint-liste für storage (nicht jeden 5s-punkt speichern,
// sondern douglas-peucker-artig grob reduzieren, damit firestore-dokumente klein bleiben)
export function simplifyTrack(points: TrackPoint[], maxPoints = 500): TrackPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0);
}

export function calculateDistanceKm(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return total;
}

function haversineKm(a: TrackPoint, b: TrackPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
