import { Earthquake, EarthquakeInput } from '../types';
import { formatTimeAgo } from './time';

/*
 * Sismos que ESTE dispositivo descargó directamente de la fuente oficial (SGC/USGS).
 * La alarma "¿Estás bien?" solo se activa con estos, nunca con lo que haya en
 * Firestore: así nadie puede disparar falsas alarmas escribiendo un sismo falso
 * en la base de datos compartida.
 */
const verified = new Map<string, Earthquake>();

export function markVerified(quakes: EarthquakeInput[]) {
  quakes.forEach((quake) => {
    verified.set(quake.id, { ...quake, timeAgo: formatTimeAgo(quake.occurredAt) });
  });
}

export function getVerifiedQuakes(): Earthquake[] {
  return [...verified.values()];
}
