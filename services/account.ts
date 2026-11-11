import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';

/*
 * Eliminación de cuenta (requisito de Google Play): borra todos los datos del
 * usuario en Firestore. Después se elimina la cuenta de Firebase Authentication.
 */

async function deleteCollection(path: string[]) {
  const db = getFirebaseDb();
  const ref = collection(db, path[0], ...path.slice(1));
  // Se borra por lotes hasta vaciar la colección.
  for (;;) {
    const snapshot = await getDocs(query(ref, limit(100)));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
}

async function deleteIfAllowed(path: string[]) {
  try {
    await deleteDoc(doc(getFirebaseDb(), path[0], ...path.slice(1)));
  } catch {
    // El documento no existe o no aplica (p. ej. perfil público nunca creado).
  }
}

export async function deleteUserData(uid: string, email: string | null) {
  await deleteCollection(['users', uid, 'contacts']);
  await deleteCollection(['users', uid, 'checkins']);
  await deleteCollection(['users', uid, 'serverCheckins']);
  await Promise.all(
    ['medical', 'preparedness', 'safety'].map((name) => deleteIfAllowed(['users', uid, 'private', name])),
  );
  await deleteIfAllowed(['presence', uid]);
  if (email) await deleteIfAllowed(['publicProfiles', email.toLowerCase()]);
  // El documento principal se borra al final: si algo falla antes, el usuario puede reintentar.
  await deleteDoc(doc(getFirebaseDb(), 'users', uid));
}
