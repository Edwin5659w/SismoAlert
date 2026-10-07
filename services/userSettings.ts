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

export async function ensureUserProfile(user: User) {
  const db = getFirebaseDb();
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email: user.email,
      createdAt: serverTimestamp(),
      ...defaultSettings,
    });
  }
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
