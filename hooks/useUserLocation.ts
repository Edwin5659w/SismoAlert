import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { UserLocation } from '../types';

const STORAGE_KEY = 'sismoalert:last-location';
const REFRESH_MS = 10 * 60 * 1000;

export type LocationState = {
  location: UserLocation | null;
  status: 'off' | 'loading' | 'ready' | 'denied' | 'error';
  message?: string;
};

// Estado compartido entre todas las pantallas: se pide la ubicación una sola vez.
let current: LocationState = { location: null, status: 'off' };
let inFlight: Promise<void> | null = null;
const listeners = new Set<(state: LocationState) => void>();

function publish(next: LocationState) {
  current = next;
  listeners.forEach((listener) => listener(next));
}

async function loadCached() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw && !current.location) {
      publish({ ...current, location: JSON.parse(raw) as UserLocation });
    }
  } catch {
    // Sin caché: no pasa nada.
  }
}

async function cityFor(latitude: number, longitude: number) {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return undefined;
    return [place.city ?? place.subregion, place.region].filter(Boolean).join(', ') || undefined;
  } catch {
    return undefined;
  }
}

/** Pide permiso (si hace falta) y actualiza la ubicación compartida. */
export async function refreshLocation(force = false) {
  if (inFlight) return inFlight;
  if (
    !force &&
    current.status === 'ready' &&
    current.location &&
    Date.now() - current.location.updatedAt < REFRESH_MS
  ) {
    return;
  }

  inFlight = (async () => {
    publish({ ...current, status: 'loading' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        publish({
          ...current,
          status: 'denied',
          message: 'Activa el permiso de ubicación para calcular la distancia a los sismos.',
        });
        return;
      }

      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: REFRESH_MS })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude, longitude, accuracy } = position.coords;
      const city = await cityFor(latitude, longitude);
      const location: UserLocation = {
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        city,
        updatedAt: Date.now(),
      };
      publish({ location, status: 'ready' });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location)).catch(() => undefined);
    } catch (error) {
      publish({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo obtener la ubicación.',
      });
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Ubicación del usuario. Solo se consulta el GPS si `enabled` es verdadero. */
export function useUserLocation(enabled: boolean) {
  const [state, setState] = useState<LocationState>(current);

  useEffect(() => {
    listeners.add(setState);
    setState(current);
    loadCached();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  useEffect(() => {
    if (enabled) {
      refreshLocation();
    }
  }, [enabled]);

  const refresh = useCallback(() => refreshLocation(true), []);

  return {
    ...state,
    location: enabled ? state.location : null,
    status: enabled ? state.status : ('off' as const),
    refresh,
  };
}
