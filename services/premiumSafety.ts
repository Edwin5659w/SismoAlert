import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';

/*
 * Parte de la app para la escalada automática (Premium), que corre en el servidor:
 *  - presence/{uid}: consentimiento + ubicación APROXIMADA (≈1 km) para saber
 *    si un sismo te afecta aunque la app esté cerrada.
 *  - users/{uid}/serverCheckins/{id}: preguntas "¿Estás bien?" creadas por el
 *    servidor. La app solo puede responder "safe" o "help" mientras estén pendientes.
 */

export type Presence = {
  autoEscalation: boolean;
  latitude?: number;
  longitude?: number;
  updatedAt?: number;
};

export type ServerCheckin = {
  id: string;
  quakeId: string;
  magnitude: number;
  place: string;
  distanceKm?: number;
  deadline: number;
  createdAt: number;
};

/** Redondea a 2 decimales (~1,1 km): suficiente para estimar la intensidad, no revela la dirección. */
export function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function millis(value: unknown) {
  return value instanceof Timestamp ? value.toMillis() : undefined;
}

export function subscribePresence(uid: string, onChange: (presence: Presence) => void) {
  return onSnapshot(
    doc(getFirebaseDb(), 'presence', uid),
    (snapshot) => {
      const data = snapshot.data();
      onChange({
        autoEscalation: data?.autoEscalation === true,
        latitude: typeof data?.latitude === 'number' ? data.latitude : undefined,
        longitude: typeof data?.longitude === 'number' ? data.longitude : undefined,
        updatedAt: millis(data?.updatedAt),
      });
    },
    () => onChange({ autoEscalation: false }),
  );
}

export function savePresence(
  uid: string,
  autoEscalation: boolean,
  location?: { latitude: number; longitude: number } | null,
) {
  return setDoc(doc(getFirebaseDb(), 'presence', uid), {
    autoEscalation,
    // Al desactivar se borra la ubicación: no se guarda si no hay consentimiento.
    ...(autoEscalation && location
      ? { latitude: roundCoordinate(location.latitude), longitude: roundCoordinate(location.longitude) }
      : {}),
    updatedAt: serverTimestamp(),
  });
}

export function subscribePendingServerCheckins(uid: string, onChange: (items: ServerCheckin[]) => void) {
  const pending = query(
    collection(getFirebaseDb(), 'users', uid, 'serverCheckins'),
    where('status', '==', 'pending'),
    limit(3),
  );
  return onSnapshot(
    pending,
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            quakeId: String(data.quakeId ?? ''),
            magnitude: Number(data.magnitude ?? 0),
            place: String(data.place ?? 'Sismo'),
            distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : undefined,
            deadline: millis(data.deadline) ?? Date.now() + 5 * 60 * 1000,
            createdAt: millis(data.createdAt) ?? Date.now(),
          };
        }),
      );
    },
    () => onChange([]),
  );
}

export function answerServerCheckin(uid: string, checkinId: string, status: 'safe' | 'help') {
  return updateDoc(doc(getFirebaseDb(), 'users', uid, 'serverCheckins', checkinId), {
    status,
    respondedAt: serverTimestamp(),
  });
}
