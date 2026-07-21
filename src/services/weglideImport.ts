import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { getUserFlightsSince, type WeglideFlightSummary } from './weglide';
import type { Flight } from '../types/models';

// importiert weglide-flüge seit der account-verknüpfung als glidr-flights.
// KEINE alt-historie (kein rückwirkendes reinziehen von flügen vor der verknüpfung),
// wie gewünscht — nur was seit dem verknüpfen neu auf weglide aufgetaucht ist.
export async function importWeglideFlightsSinceLinking(
  uid: string,
  weglideUserId: number,
  linkedAtUnixMs: number
): Promise<number> {
  const weglideFlights = await getUserFlightsSince(weglideUserId, linkedAtUnixMs);
  if (weglideFlights.length === 0) return 0;

  // bereits importierte flüge nicht doppelt anlegen
  const existingQuery = query(collection(db, 'flights'), where('uid', '==', uid), where('dataSource', '==', 'weglide'));
  const existingSnap = await getDocs(existingQuery);
  const alreadyImportedWeglideIds = new Set(
    existingSnap.docs.map((d) => (d.data() as Flight).weglideFlightId).filter(Boolean)
  );

  let importedCount = 0;

  for (const wgFlight of weglideFlights) {
    if (alreadyImportedWeglideIds.has(wgFlight.id)) continue;

    const startTime = new Date(wgFlight.takeoff_time).getTime();
    const endTime = new Date(wgFlight.landing_time).getTime();
    const flightId = `weglide_${wgFlight.id}`;

    const flight: Flight = {
      id: flightId,
      uid,
      status: 'processing', // user muss noch caption/foto ergänzen und posten
      gliderRegistration: '',
      startTime,
      endTime,
      distanceKm: wgFlight.contest.distance,
      maxAltitudeM: 0, // nicht im summary-endpoint enthalten, könnte via flightdetail nachgeladen werden
      durationSec: Math.round((endTime - startTime) / 1000),
      avgSpeedKmh: wgFlight.contest.speed,
      trackPoints: [], // kein GPS-track vorhanden, kam ja über weglide-logger
      startAirfield: null,
      landingAirfield: null,
      dataSource: 'weglide' as Flight['dataSource'],
      weglideFlightId: wgFlight.id,
      olcPoints: wgFlight.points,
    };

    await setDoc(doc(db, 'flights', flightId), flight);
    importedCount++;
  }

  return importedCount;
}
