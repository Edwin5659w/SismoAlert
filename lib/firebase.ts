import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { firebaseKeys, isFirebaseConfigured } from '../config/firebaseKeys';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function getNativePersistence(): Persistence {
  const factory = (
    FirebaseAuth as unknown as {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    }
  ).getReactNativePersistence;

  if (!factory) {
    throw new Error('Persistencia de Auth no disponible en este entorno');
  }

  return factory(AsyncStorage);
}

function createAuth(firebaseApp: FirebaseApp) {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: getNativePersistence(),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase no está configurado. Completa el archivo .env');
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseKeys);
  }

  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = createAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb() {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
