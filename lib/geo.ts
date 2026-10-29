import { Earthquake } from '../types';

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function quakeDistanceKm(
  earthquake: Earthquake,
  location: { latitude: number; longitude: number } | null | undefined,
) {
  if (!location || earthquake.latitude === undefined || earthquake.longitude === undefined) {
    return undefined;
  }
  return distanceKm(location, { latitude: earthquake.latitude, longitude: earthquake.longitude });
}

export function formatDistance(km: number | undefined) {
  if (km === undefined) {
    return '';
  }
  if (km < 1) {
    return 'a menos de 1 km';
  }
  return `a ${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function parseRadiusKm(option: string) {
  return Number.parseFloat(option) || 100;
}

export function mapsLink(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}
