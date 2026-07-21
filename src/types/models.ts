// ===== firestore collections =====
// users/{uid}
// clubs/{clubId}          <- gecachte kopie von weglide club-daten
// flights/{flightId}
// posts/{postId}
// liveTracks/{uid}        <- nur während aktivem flug vorhanden, danach gelöscht
// follows/{followerUid_followingUid}
// likes/{postId_uid}
// comments/{postId}/items/{commentId}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string; // unique, für @mentions/links
  photoUrl: string | null;
  bio: string;
  clubId: string | null; // ref auf clubs/{clubId}
  weglideUserId: number | null; // verknüpfung zu weglide profil für auto-sync
  weglideLinkedAt: number | null; // unix ms, ab wann flüge importiert werden (keine alt-historie)
  gliderRegistration: string | null; // eigenes kennzeichen für OGN-matching, z.b. "D-1234"
  followerCount: number;
  followingCount: number;
  totalDistanceKm: number; // aggregiert, wird bei jedem neuen flug hochgezählt
  pushToken: string | null;
  createdAt: number; // unix ms
}

export interface Club {
  id: string; // weglide club id als string
  name: string;
  country: string;
  weglideClubId: number;
  lastSyncedAt: number;
}

export type FlightStatus = 'live' | 'processing' | 'published' | 'discarded';

export interface Flight {
  id: string;
  uid: string;
  status: FlightStatus;
  gliderRegistration: string;
  startTime: number;
  endTime: number | null;
  distanceKm: number;
  maxAltitudeM: number;
  durationSec: number;
  avgSpeedKmh: number;
  trackPoints: TrackPoint[]; // vereinfachte polyline, nicht jeder GPS-punkt
  startAirfield: string | null;
  landingAirfield: string | null;
  dataSource: 'ogn' | 'gps' | 'hybrid' | 'weglide';
  weglideFlightId: number | null; // falls auch auf weglide hochgeladen/gematcht
  olcPoints: number | null;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  altM: number;
  timestamp: number;
}

export type PostType = 'flight' | 'text';

export interface Post {
  id: string;
  uid: string;
  type: PostType;
  flightId: string | null; // gesetzt wenn type === 'flight'
  caption: string;
  photoUrls: string[];
  likeCount: number;
  commentCount: number;
  createdAt: number;
}

export interface LiveTrackPosition {
  uid: string;
  displayName: string;
  gliderRegistration: string;
  lat: number;
  lng: number;
  altM: number;
  headingDeg: number;
  climbRateMs: number | null;
  updatedAt: number;
  flightId: string;
}

export interface Follow {
  followerUid: string;
  followingUid: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  uid: string;
  text: string;
  createdAt: number;
}
