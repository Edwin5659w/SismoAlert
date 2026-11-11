const EARTH_RADIUS_KM = 6371;

const rad = (value: number) => (value * Math.PI) / 180;

export type Point = { latitude: number; longitude: number };

/** Distancia en superficie (Haversine), en km. */
export function surfaceDistanceKm(a: Point, b: Point) {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Intensidad Mercalli (MMI) ESTIMADA en el sitio del usuario.
 *
 * Usa una relación de atenuación simple (forma general I = a + b·M − c·log10(R)),
 * con R = distancia hipocentral. Es una aproximación: sirve para decidir si un
 * sismo "probablemente se sintió fuerte" y evitar alertas por sismos lejanos o
 * profundos, NO para reportes oficiales.
 */
export function estimateIntensity(magnitude: number, surfaceKm: number, depthKm: number) {
  const hypocentralKm = Math.max(1, Math.sqrt(surfaceKm ** 2 + Math.max(0, depthKm) ** 2));
  const intensity = 1.68 + 1.5 * magnitude - 3.0 * Math.log10(hypocentralKm);
  return Math.max(1, Math.min(12, Math.round(intensity * 10) / 10));
}
