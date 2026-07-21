// WICHTIG: Dieser Code läuft NICHT im Expo-Client, sondern als Firebase Cloud Function
// (Node.js Backend, getriggert von Firestore). Er gehört separat deployed, z.B. über
// `firebase deploy --only functions`. Braucht ein eigenes kleines Node-Projekt im
// functions/-Ordner mit `firebase-functions` und `firebase-admin` als Dependencies.
//
// Grund warum das nicht im Client laufen kann: Ein Client kann nicht zuverlässig
// "wenn irgendein anderer User X started, push an dessen Follower" auslösen — jeder
// Client sieht nur sich selbst. Das muss serverseitig auf Firestore-Änderungen
// reagieren.
//
// Setup (einmalig):
//   firebase init functions
//   diese Datei nach functions/src/index.ts kopieren
//   firebase deploy --only functions

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// feuert immer wenn ein neues liveTracks-dokument angelegt wird (= jemand startet)
export const notifyFollowersOnTakeoff = functions.firestore
  .document('liveTracks/{uid}')
  .onCreate(async (snapshot) => {
    const liveTrack = snapshot.data();
    const pilotUid = liveTrack.uid as string;
    const pilotName = liveTrack.displayName as string;

    // alle follower dieses piloten finden
    const followsSnap = await db
      .collection('follows')
      .where('followingUid', '==', pilotUid)
      .get();

    if (followsSnap.empty) return;

    const followerUids = followsSnap.docs.map((d) => d.data().followerUid as string);

    // push-tokens der follower laden
    const userDocs = await Promise.all(
      followerUids.map((uid) => db.collection('users').doc(uid).get())
    );

    const pushTokens = userDocs
      .map((doc) => doc.data()?.pushToken as string | undefined)
      .filter((token): token is string => Boolean(token));

    if (pushTokens.length === 0) return;

    // expo push api direkt ansprechen (kein extra sdk nötig für einfache sends)
    const messages = pushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: 'flug gestartet',
      body: `${pilotName} ist grad gestartet — jetzt live verfolgen`,
      data: { type: 'takeoff', pilotUid },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  });
