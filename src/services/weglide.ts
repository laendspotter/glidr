// WeGlide Public API Client — nur lesender Zugriff
//
// WICHTIG: OAuth (Upload in Namen von Usern) und Mobile-Logger-Status
// vergibt WeGlide erst ab 500-1000 aktiven App-Usern. Bis dahin nutzen
// wir NUR den public API-Key für Read-Only-Requests (60/Tag Limit).
// Key kommt aus Profil -> Settings -> Advanced -> API Key auf weglide.org
//
// Sobald die App genug User hat: bei WeGlide für OAuth anfragen,
// dann können User ihre Konten verknüpfen und Flüge werden automatisch
// synced statt nur gelesen.

const WEGLIDE_API_BASE = 'https://api.weglide.org/v1';

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_WEGLIDE_API_KEY;
  if (!key) {
    throw new Error('EXPO_PUBLIC_WEGLIDE_API_KEY fehlt in den env vars');
  }
  return key;
}

async function weglideGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${WEGLIDE_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': getApiKey() },
  });

  if (!res.ok) {
    throw new Error(`weglide api fehler: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface WeglideClub {
  id: number;
  name: string;
  country: string;
}

export interface WeglideUser {
  id: number;
  name: string;
  club: WeglideClub | null;
}

export interface WeglideFlightSummary {
  id: number;
  scoring_date: string;
  takeoff_time: string; // ISO timestamp, für "seit verknüpfung"-filter gebraucht
  landing_time: string;
  contest: {
    distance: number; // km
    speed: number; // km/h
  };
  points: number; // OLC/DMSt punkte
  user: WeglideUser;
}

// vereinsliste per suche laden (für auswahl bei registrierung)
export async function searchClubs(query: string): Promise<WeglideClub[]> {
  return weglideGet<WeglideClub[]>('/club', { name: query, limit: '20' });
}

export async function getClub(clubId: number): Promise<WeglideClub> {
  return weglideGet<WeglideClub>(`/club/${clubId}`);
}

// öffentliche flüge eines users laden, für stats/olc-anzeige im profil
export async function getUserFlights(weglideUserId: number, season?: number): Promise<WeglideFlightSummary[]> {
  return weglideGet<WeglideFlightSummary[]>('/flight', {
    user_id_in: String(weglideUserId),
    ...(season ? { season: String(season) } : {}),
    limit: '50',
  });
}

// wie getUserFlights, aber nur flüge NACH einem bestimmten zeitpunkt (z.b. seit
// account-verknüpfung). es gibt keinen direkten "since"-query-parameter in der
// weglide-api, deshalb laden wir die liste und filtern client-seitig
export async function getUserFlightsSince(weglideUserId: number, sinceUnixMs: number): Promise<WeglideFlightSummary[]> {
  const all = await getUserFlights(weglideUserId);
  return all.filter((f) => new Date(f.takeoff_time).getTime() >= sinceUnixMs);
}

// KEIN automatischer upload möglich (OAuth erst ab 500-1000 usern, siehe hinweis
// oben). stattdessen: link zur weglide-upload-seite öffnen, user lädt manuell
// hoch. das ist der einzige upload-weg der ohne OAuth-freigabe funktioniert.
export function getWeglideUploadUrl(): string {
  return 'https://www.weglide.org/flight/add';
}

// user anhand namen suchen, um weglide-profil mit app-profil zu verknüpfen
export async function searchWeglideUser(name: string): Promise<WeglideUser[]> {
  return weglideGet<WeglideUser[]>('/user', { name, limit: '10' });
}
