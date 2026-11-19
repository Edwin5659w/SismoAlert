import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import {
  CheckInStatus,
  ContactRelation,
  MedicalInfo,
  Preparedness,
  SafetySettings,
  TrustedContact,
} from '../types';

/*
 * Datos de seguridad de cada usuario, guardados como subcolecciones de users/{uid}:
 *   contacts/{id}        contactos de confianza
 *   private/medical      ficha de emergencia
 *   private/preparedness kit de emergencia y plan familiar
 *   private/safety       ajustes del modo "¿Estás bien?"
 *   checkins/{id}        historial de respuestas tras un sismo
 * y publicProfiles/{correo}: token push para que los contactos vinculados reciban avisos.
 */

export const MAX_CONTACTS = 10;

export const defaultSafetySettings: SafetySettings = {
  checkInEnabled: true,
  checkInMagnitude: '5.0+',
  checkInMinutes: 3,
  notifyLinkedContacts: true,
};

export const emptyMedicalInfo: MedicalInfo = {
  bloodType: '',
  allergies: '',
  conditions: '',
  medications: '',
  healthInsurer: '',
  notes: '',
};

export const emptyPreparedness: Preparedness = {
  kit: [],
  meetingPoint: '',
  familyPlan: '',
};

function db() {
  return getFirebaseDb();
}

function toMillis(value: unknown) {
  return value instanceof Timestamp ? value.toMillis() : typeof value === 'number' ? value : undefined;
}

function str(value: unknown, max = 500) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

// ---------- Ajustes del modo "¿Estás bien?" ----------

export function subscribeSafetySettings(uid: string, onChange: (settings: SafetySettings) => void) {
  return onSnapshot(
    doc(db(), 'users', uid, 'private', 'safety'),
    (snapshot) => {
      const data = snapshot.data() ?? {};
      onChange({
        checkInEnabled:
          typeof data.checkInEnabled === 'boolean'
            ? data.checkInEnabled
            : defaultSafetySettings.checkInEnabled,
        checkInMagnitude: str(data.checkInMagnitude) || defaultSafetySettings.checkInMagnitude,
        checkInMinutes:
          typeof data.checkInMinutes === 'number'
            ? data.checkInMinutes
            : defaultSafetySettings.checkInMinutes,
        notifyLinkedContacts:
          typeof data.notifyLinkedContacts === 'boolean'
            ? data.notifyLinkedContacts
            : defaultSafetySettings.notifyLinkedContacts,
      });
    },
    () => onChange(defaultSafetySettings),
  );
}

export function saveSafetySettings(uid: string, settings: SafetySettings) {
  return setDoc(doc(db(), 'users', uid, 'private', 'safety'), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

// ---------- Contactos de confianza ----------

export function subscribeTrustedContacts(
  uid: string,
  onChange: (contacts: TrustedContact[]) => void,
) {
  const contactsQuery = query(
    collection(db(), 'users', uid, 'contacts'),
    orderBy('createdAt', 'asc'),
    limit(MAX_CONTACTS),
  );
  return onSnapshot(
    contactsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            name: str(data.name, 60),
            phone: str(data.phone, 20),
            relation: (str(data.relation) || 'Otro') as ContactRelation,
            appEmail: str(data.appEmail, 254) || undefined,
            createdAt: toMillis(data.createdAt) ?? Date.now(),
          };
        }),
      );
    },
    () => onChange([]),
  );
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

export async function addTrustedContact(
  uid: string,
  contact: Pick<TrustedContact, 'name' | 'phone' | 'relation' | 'appEmail'>,
) {
  await addDoc(collection(db(), 'users', uid, 'contacts'), {
    name: contact.name.trim(),
    phone: normalizePhone(contact.phone),
    relation: contact.relation,
    ...(contact.appEmail ? { appEmail: contact.appEmail.trim().toLowerCase() } : {}),
    createdAt: serverTimestamp(),
  });
}

export function removeTrustedContact(uid: string, contactId: string) {
  return deleteDoc(doc(db(), 'users', uid, 'contacts', contactId));
}

// ---------- Ficha de emergencia ----------

export function subscribeMedicalInfo(uid: string, onChange: (info: MedicalInfo | null) => void) {
  return onSnapshot(
    doc(db(), 'users', uid, 'private', 'medical'),
    (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        onChange(null);
        return;
      }
      onChange({
        bloodType: str(data.bloodType, 10),
        allergies: str(data.allergies),
        conditions: str(data.conditions),
        medications: str(data.medications),
        healthInsurer: str(data.healthInsurer, 100),
        notes: str(data.notes),
      });
    },
    () => onChange(null),
  );
}

export function saveMedicalInfo(uid: string, info: MedicalInfo) {
  return setDoc(doc(db(), 'users', uid, 'private', 'medical'), {
    bloodType: info.bloodType,
    allergies: info.allergies.trim(),
    conditions: info.conditions.trim(),
    medications: info.medications.trim(),
    healthInsurer: info.healthInsurer.trim(),
    notes: info.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export function isMedicalInfoComplete(info: MedicalInfo | null) {
  return Boolean(info?.bloodType);
}

// ---------- Kit y plan familiar ----------

export function subscribePreparedness(uid: string, onChange: (data: Preparedness) => void) {
  return onSnapshot(
    doc(db(), 'users', uid, 'private', 'preparedness'),
    (snapshot) => {
      const data = snapshot.data() ?? {};
      onChange({
        kit: Array.isArray(data.kit) ? data.kit.filter((item) => typeof item === 'string') : [],
        meetingPoint: str(data.meetingPoint, 200),
        familyPlan: str(data.familyPlan, 1000),
        lastDrillAt: toMillis(data.lastDrillAt),
      });
    },
    () => onChange(emptyPreparedness),
  );
}

export function savePreparedness(uid: string, data: Preparedness) {
  return setDoc(doc(db(), 'users', uid, 'private', 'preparedness'), {
    kit: data.kit,
    meetingPoint: data.meetingPoint.trim(),
    familyPlan: data.familyPlan.trim(),
    ...(data.lastDrillAt ? { lastDrillAt: Timestamp.fromMillis(data.lastDrillAt) } : {}),
    updatedAt: serverTimestamp(),
  });
}

// ---------- Historial de "¿Estás bien?" ----------

export function recordCheckIn(
  uid: string,
  entry: {
    status: CheckInStatus;
    drill: boolean;
    earthquakeId: string;
    magnitude: number;
    place: string;
    distanceKm?: number;
    latitude?: number;
    longitude?: number;
  },
) {
  return addDoc(collection(db(), 'users', uid, 'checkins'), {
    status: entry.status,
    drill: entry.drill,
    earthquakeId: entry.earthquakeId.slice(0, 100),
    magnitude: entry.magnitude,
    place: entry.place.slice(0, 200),
    ...(entry.distanceKm !== undefined ? { distanceKm: Math.round(entry.distanceKm) } : {}),
    ...(entry.latitude !== undefined && entry.longitude !== undefined
      ? { latitude: entry.latitude, longitude: entry.longitude }
      : {}),
    createdAt: serverTimestamp(),
  });
}

export type CheckInRecord = {
  id: string;
  status: CheckInStatus;
  drill: boolean;
  magnitude: number;
  place: string;
  createdAt: number;
};

export function subscribeCheckIns(uid: string, onChange: (items: CheckInRecord[]) => void) {
  const checkInsQuery = query(
    collection(db(), 'users', uid, 'checkins'),
    orderBy('createdAt', 'desc'),
    limit(5),
  );
  return onSnapshot(
    checkInsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            status: str(data.status) as CheckInStatus,
            drill: Boolean(data.drill),
            magnitude: Number(data.magnitude ?? 0),
            place: str(data.place, 200),
            createdAt: toMillis(data.createdAt) ?? Date.now(),
          };
        }),
      );
    },
    () => onChange([]),
  );
}

// ---------- Perfil público (para avisar a contactos vinculados) ----------

/** Publica el token push bajo el correo del usuario para que sus contactos puedan avisarle. */
export async function publishSafetyProfile(
  user: { uid: string; email: string | null; displayName: string | null },
  expoPushToken: string,
) {
  if (!user.email) return;
  await setDoc(doc(db(), 'publicProfiles', user.email.toLowerCase()), {
    uid: user.uid,
    name: (user.displayName ?? user.email.split('@')[0]).slice(0, 100),
    expoPushToken,
    updatedAt: serverTimestamp(),
  });
}

export async function getLinkedPushToken(email: string) {
  try {
    const snapshot = await getDoc(doc(db(), 'publicProfiles', email.trim().toLowerCase()));
    const token = snapshot.data()?.expoPushToken;
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}
