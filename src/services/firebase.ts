import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// alle keys kommen aus app.json -> extra oder env vars, niemals hardcoded
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseSenderId ?? process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// react native braucht eigene persistence via async-storage, sonst kein login-remember
export const auth = getApps().length === 0
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
