// OGN APRS-Anbindung für Start-Erkennung
//
// Ablauf:
// 1. App matched die registrierte Kennung des Users gegen den OGN APRS-Stream
// 2. Erkennt OGN eine Bewegung/Start dieser Kennung -> Signal an App
// 3. App fragt GPS-Permission ab und startet lokales GPS-Tracking (Genauigkeit)
// 4. Landung: OGN-Signal weg ODER GPS zeigt Stillstand am Boden -> Flug beendet
//
// OGN selbst bietet keine direkte REST-API für Live-Positionen, der übliche
// Weg ist entweder:
//   a) eigener APRS-Client der den OGN-APRS-Server (aprs.glidernet.org:14580) abhört
//   b) die inoffizielle Feed-API auf api.glidernet.org (JSON, wird von live.glidernet.org genutzt)
// Für Mobile ist (b) einfacher, da kein persistenter TCP-Socket nötig ist.
// Backend-Bridge läuft am besten als kleiner Server (siehe glideos APRS-Backend),
// der den APRS-Stream hält und Ergebnisse per Firestore/Websocket an die App weiterreicht.

const OGN_FEED_API = 'https://api.glidernet.org/live';

export interface OgnAircraft {
  registration: string;
  lat: number;
  lng: number;
  altM: number;
  headingDeg: number;
  climbRateMs: number;
  groundSpeedKmh: number;
  lastSeenUnix: number;
}

// pollt die inoffizielle OGN live-api nach einer bestimmten kennung
// wird vom start-detection-service in kurzen intervallen aufgerufen solange
// der user "bereit zum fliegen" ist (z.b. app im vordergrund am flugplatz)
export async function pollOgnForRegistration(registration: string): Promise<OgnAircraft | null> {
  const res = await fetch(`${OGN_FEED_API}/${encodeURIComponent(registration)}.json`);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || !data.lat) return null;

  return {
    registration,
    lat: data.lat,
    lng: data.lng,
    altM: data.alt,
    headingDeg: data.course ?? 0,
    climbRateMs: data.vspeed ?? 0,
    groundSpeedKmh: data.speed ?? 0,
    lastSeenUnix: data.timestamp,
  };
}

// heuristik: gilt als "gestartet" wenn groundspeed > 40km/h UND altitude
// sich innerhalb der letzten polls signifikant erhöht hat
export function isLikelyAirborne(current: OgnAircraft, previousAltM: number | null): boolean {
  const climbedEnough = previousAltM !== null && current.altM - previousAltM > 15;
  return current.groundSpeedKmh > 40 && (climbedEnough || current.climbRateMs > 1.5);
}

// heuristik: gilt als "gelandet" wenn groundspeed niedrig UND altitude stabil
// über mehrere aufeinanderfolgende polls
export function isLikelyOnGround(current: OgnAircraft, altHistoryM: number[]): boolean {
  if (altHistoryM.length < 3) return false;
  const recentSpread = Math.max(...altHistoryM) - Math.min(...altHistoryM);
  return current.groundSpeedKmh < 15 && recentSpread < 10;
}
