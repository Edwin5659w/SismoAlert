import { useEffect, useState } from 'react';
import { syncEarthquakes } from '../services/earthquakes';
import { SyncStatus } from '../types';

const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

let currentStatus: SyncStatus = { state: 'idle' };
let inFlight: Promise<void> | null = null;
const listeners = new Set<(status: SyncStatus) => void>();

function publish(next: SyncStatus) {
  currentStatus = next;
  listeners.forEach((listener) => listener(next));
}

/**
 * Sincroniza Firestore con la fuente real. Sin `force` respeta un intervalo mínimo
 * para no consultar la fuente en cada pantalla.
 */
export async function runEarthquakeSync(force = false) {
  if (inFlight) {
    return inFlight;
  }

  const recentlySynced =
    currentStatus.state === 'ok' &&
    currentStatus.syncedAt !== undefined &&
    Date.now() - currentStatus.syncedAt < MIN_SYNC_INTERVAL_MS;

  if (!force && recentlySynced) {
    return;
  }

  publish({ ...currentStatus, state: 'syncing' });
  inFlight = syncEarthquakes()
    .then(publish)
    .catch((error) => {
      publish({
        ...currentStatus,
        state: 'error',
        message:
          error instanceof Error ? error.message : 'No se pudo sincronizar con la fuente de sismos.',
      });
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function useEarthquakeSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(currentStatus);

  useEffect(() => {
    listeners.add(setStatus);
    setStatus(currentStatus);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  return status;
}
