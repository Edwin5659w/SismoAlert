/** Lectura de sismos de SGC (oficial) con respaldo USGS, igual que la app. */

export type Quake = {
  id: string;
  magnitude: number;
  place: string;
  depthKm: number;
  occurredAt: number;
  latitude: number;
  longitude: number;
  source: 'SGC' | 'USGS';
};

type Feature = {
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: number[] } | null;
};

export function parseFeatures(features: Feature[] | undefined, source: 'SGC' | 'USGS'): Quake[] {
  return (features ?? [])
    .map((feature): Quake | null => {
      const p = feature.properties ?? {};
      const [longitude, latitude, depth] = feature.geometry?.coordinates ?? [];
      const magnitude = Number(p.mag);
      const time = typeof p.time === 'number' ? p.time : Date.parse(String(p.time ?? ''));
      const rawId = String(feature.id ?? '').replace(/[^A-Za-z0-9_-]/g, '');
      if (!rawId || !Number.isFinite(time) || !Number.isFinite(magnitude)) return null;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return {
        // Mismo ID que usa la app, para enlazar la pregunta local con la del servidor.
        id: `${source.toLowerCase()}-${rawId}`.slice(0, 100),
        magnitude: Math.round(magnitude * 10) / 10,
        place: String(p.place ?? p.title ?? 'Ubicación desconocida').slice(0, 200),
        depthKm: Math.max(0, Number(depth) || 0),
        occurredAt: time,
        latitude,
        longitude,
        source,
      };
    })
    .filter((quake): quake is Quake => quake !== null);
}

const SGC_URL = 'https://api.sgc.gov.co/feed/v1.0.1/summary/five_days_all.json';
const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

async function getJson(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  return (await response.json()) as { features?: Feature[] };
}

export async function fetchRecentQuakes(): Promise<Quake[]> {
  try {
    const quakes = parseFeatures((await getJson(SGC_URL)).features, 'SGC');
    if (quakes.length) return quakes;
  } catch (error) {
    console.warn('SGC no respondió; se usa USGS.', error);
  }
  const params = new URLSearchParams({
    format: 'geojson',
    orderby: 'time',
    limit: '100',
    starttime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    minlatitude: '-4.5',
    maxlatitude: '13.5',
    minlongitude: '-82',
    maxlongitude: '-66',
  });
  return parseFeatures((await getJson(`${USGS_URL}?${params}`)).features, 'USGS');
}
