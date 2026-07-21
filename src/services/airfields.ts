// Flugplatz-Erkennung aus Koordinaten
//
// Es gibt keine offizielle Live-API für Flugplatz-Reverse-Lookup, aber die
// WeGlide-API hat einen öffentlichen /airport Endpoint mit Koordinaten aller
// bekannten Flugplätze weltweit — den nutzen wir für den Abgleich.
// Der Airport-Datensatz wird einmalig geladen und lokal gecacht (ändert sich
// praktisch nie), statt bei jedem Flug neu abzufragen.

const WEGLIDE_API_BASE = 'https://api.weglide.org/v1';

export interface Airfield {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

let cachedAirfields: Airfield[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h, flugplätze ändern sich quasi nie

async function loadAirfieldCache(): Promise<Airfield[]> {
  const now = Date.now();
  if (cachedAirfields && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedAirfields;
  }

  const apiKey = process.env.EXPO_PUBLIC_WEGLIDE_API_KEY;
  const res = await fetch(`${WEGLIDE_API_BASE}/airport`, {
    headers: apiKey ? { 'X-API-Key': apiKey } : {},
  });

  if (!res.ok) {
    // wenn der abruf scheitert, alten cache weiterverwenden statt crash
    return cachedAirfields ?? [];
  }

  const data = await res.json();
  cachedAirfields = data.map((a: any) => ({ id: a.id, name: a.name, lat: a.latitude, lng: a.longitude }));
  cacheTimestamp = now;
  return cachedAirfields!;
}

// findet den nächstgelegenen bekannten flugplatz zu einer koordinate,
// gibt null zurück wenn nichts in radius liegt (z.b. außenlandung)
export async function findNearestAirfield(lat: number, lng: number, maxRadiusKm = 5): Promise<Airfield | null> {
  const airfields = await loadAirfieldCache();
  if (airfields.length === 0) return null;

  let nearest: Airfield | null = null;
  let nearestDist = Infinity;

  for (const field of airfields) {
    const dist = haversineKm(lat, lng, field.lat, field.lng);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = field;
    }
  }

  return nearestDist <= maxRadiusKm ? nearest : null;
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
