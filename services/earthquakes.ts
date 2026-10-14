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
import { Earthquake, EarthquakeInput, SyncStatus } from '../types';
import { fetchLatestEarthquakes } from './sources';

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
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    source: typeof data.source === 'string' ? data.source : undefined,
    url: typeof data.url === 'string' ? data.url : undefined,
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

export function subscribeEarthquakes(
  onChange: (earthquakes: Earthquake[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();
  const earthquakesQuery = query(collection(db, 'earthquakes'), orderBy('occurredAt', 'desc'));

  return onSnapshot(
    earthquakesQuery,
    (snapshot) => {
      const earthquakes = snapshot.docs.map((item) => mapEarthquake(item.id, item.data()));
      onChange(earthquakes);
    },
    onError,
  );
}

// Mismos límites que valida `isValidEarthquake` en firestore.rules.
function meetsRules(earthquake: EarthquakeInput) {
  return (
    earthquake.magnitude >= -2 &&
    earthquake.magnitude <= 10 &&
    earthquake.depthKm >= 0 &&
    earthquake.depthKm <= 800 &&
    earthquake.occurredAt <= Date.now() &&
    earthquake.latitude >= -90 &&
    earthquake.latitude <= 90 &&
    earthquake.longitude >= -180 &&
    earthquake.longitude <= 180 &&
    earthquake.location.length > 0 &&
    earthquake.location.length <= 200
  );
}

/**
 * Consulta la fuente real (SGC con respaldo USGS) y la guarda en `earthquakes`.
 * Usa el ID del evento como ID del documento, así que no se duplican registros.
 */
export async function syncEarthquakes(): Promise<SyncStatus> {
  const db = getFirebaseDb();
  const { source, earthquakes: fetched } = await fetchLatestEarthquakes();
  const earthquakes = fetched.filter(meetsRules);

  try {
    for (let index = 0; index < earthquakes.length; index += 400) {
      const batch = writeBatch(db);
      earthquakes.slice(index, index + 400).forEach((earthquake) => {
        batch.set(doc(db, 'earthquakes', earthquake.id), {
          magnitude: earthquake.magnitude,
          location: earthquake.location,
          depthKm: earthquake.depthKm,
          occurredAt: Timestamp.fromMillis(earthquake.occurredAt),
          severity: earthquake.severity,
          latitude: earthquake.latitude,
          longitude: earthquake.longitude,
          source: earthquake.source,
          ...(earthquake.url ? { url: earthquake.url } : {}),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') {
      throw new Error(
        'Firestore rechazó la escritura. Verifica que las reglas de firestore.rules estén desplegadas.',
      );
    }
    throw error;
  }

  return { state: 'ok', source, count: earthquakes.length, syncedAt: Date.now() };
}

export function subscribeEarthquake(
  id: string,
  onChange: (earthquake: Earthquake | null) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();

  return onSnapshot(
    doc(db, 'earthquakes', id),
    (snapshot) => {
      const data = snapshot.data();
      onChange(data ? mapEarthquake(snapshot.id, data) : null);
    },
    onError,
  );
}
