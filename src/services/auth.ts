import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '../types/models';

// google auth-session hook, in nem screen/component nutzen:
// const [request, response, promptAsync] = useGoogleAuth();
export function useGoogleAuthConfig() {
  return Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function signInWithApple(): Promise<User> {
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken!,
  });

  const result = await signInWithCredential(auth, credential);
  await ensureUserProfile(result.user, appleCredential.fullName?.givenName ?? undefined);
  return result.user;
}

// legt bei erster anmeldung ein leeres profil-dokument an
async function ensureUserProfile(user: User, fallbackName?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName ?? fallbackName ?? 'neuer pilot',
    username: `pilot_${user.uid.slice(0, 8)}`,
    photoUrl: user.photoURL,
    bio: '',
    clubId: null,
    weglideUserId: null,
    weglideLinkedAt: null,
    gliderRegistration: null,
    followerCount: 0,
    followingCount: 0,
    totalDistanceKm: 0,
    pushToken: null,
    createdAt: Date.now(),
  };

  await setDoc(ref, profile);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
