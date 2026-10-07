import {
  Timestamp,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { seedEarthquakes } from '../data/mockEarthquakes';
import { getFirebaseDb } from '../lib/firebase';
import { formatTimeAgo } from '../lib/time';
import { Earthquake } from '../types';

function mapEarthquake(id: string, data: Record<string, unknown>): Earthquake {
  const occurredAt =
    data.occurredAt instanceof Timestamp
      ? data.occurredAt.toMillis()
      : typeof data.occurredAt === 'number'
        ? data.occurredAt
        : Date.now();

  return {
    id,
    magnitude: Number(data.magnitude ?? 0),
    location: String(data.location ?? 'Ubicación desconocida'),
    depthKm: Number(data.depthKm ?? 0),
    occurredAt,
    timeAgo: formatTimeAgo(occurredAt),
    severity: (data.severity as Earthquake['severity']) ?? 'Leve',
  };
}

export async function seedEarthquakesIfEmpty() {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, 'earthquakes'));
  if (!snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  seedEarthquakes.forEach((earthquake) => {
    batch.set(doc(collection(db, 'earthquakes')), {
      magnitude: earthquake.magnitude,
      location: earthquake.location,
      depthKm: earthquake.depthKm,
      occurredAt: Timestamp.fromMillis(earthquake.occurredAt),
      severity: earthquake.severity,
    });
  });
  await batch.commit();
}

export function subscribeEarthquakes(onChange: (earthquakes: Earthquake[]) => void) {
  const db = getFirebaseDb();
  const earthquakesQuery = query(collection(db, 'earthquakes'), orderBy('occurredAt', 'desc'));

  return onSnapshot(earthquakesQuery, (snapshot) => {
    const earthquakes = snapshot.docs.map((item) => mapEarthquake(item.id, item.data()));
    onChange(earthquakes);
  });
}
