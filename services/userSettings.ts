import { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { UserSettings } from '../types';

export const defaultSettings: UserSettings = {
  alertsEnabled: true,
  importantAlerts: true,
  minMagnitude: '4.0+',
  gpsEnabled: false,
  alertRadius: '100 km',
};

function mapSettings(data: Record<string, unknown> | undefined): UserSettings {
  return {
    alertsEnabled: Boolean(data?.alertsEnabled ?? defaultSettings.alertsEnabled),
    importantAlerts: Boolean(data?.importantAlerts ?? defaultSettings.importantAlerts),
    minMagnitude: String(data?.minMagnitude ?? defaultSettings.minMagnitude),
    gpsEnabled: Boolean(data?.gpsEnabled ?? defaultSettings.gpsEnabled),
    alertRadius: String(data?.alertRadius ?? defaultSettings.alertRadius),
  };
}

/**
 * Crea el documento `users/{uid}` si aún no existe.
 * Los campos coinciden con lo que permiten las reglas de `firestore.rules`.
 */
export async function ensureUserProfile(user: User, name?: string) {
  const db = getFirebaseDb();
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return;
  }

  const profileName =
    (name ?? user.displayName ?? user.email?.split('@')[0] ?? 'Usuario').trim().slice(0, 100) ||
    'Usuario';

  await setDoc(ref, {
    uid: user.uid,
    name: profileName,
    email: user.email ?? '',
    createdAt: serverTimestamp(),
    role: 'user',
    ...defaultSettings,
  });
}

export function subscribeUserSettings(uid: string, onChange: (settings: UserSettings) => void) {
  const db = getFirebaseDb();
  const ref = doc(db, 'users', uid);

  return onSnapshot(ref, (snapshot) => {
    onChange(mapSettings(snapshot.data()));
  });
}

export async function saveUserSettings(uid: string, settings: UserSettings) {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, 'users', uid),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
