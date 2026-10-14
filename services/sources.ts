import { EarthquakeInput, Severity } from '../types';

// Servicio Geológico Colombiano (fuente oficial) y USGS como respaldo.
const SGC_FEED_URL = 'https://api.sgc.gov.co/feed/v1.0.1/summary/five_days_all.json';
const USGS_FEED_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const REQUEST_TIMEOUT_MS = 15000;

// Recuadro geográfico que cubre Colombia y su zona de influencia.
const COLOMBIA_BOUNDS = {
  minlatitude: -4.5,
  maxlatitude: 13.5,
  minlongitude: -82,
  maxlongitude: -66,
};

type GeoJsonFeature = {
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: number[] } | null;
};

export type SourceResult = {
  source: 'SGC' | 'USGS';
  earthquakes: EarthquakeInput[];
};

export function severityFromMagnitude(magnitude: number): Severity {
  if (magnitude >= 6) return 'Muy fuerte';
  if (magnitude >= 5) return 'Fuerte';
  if (magnitude >= 4) return 'Moderado';
  return 'Leve';
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as { features?: GeoJsonFeature[] };
  } finally {
    clearTimeout(timer);
  }
}

function parseTime(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Date.parse(String(value ?? ''));
  return Number.isNaN(parsed) ? null : parsed;
}

function mapFeature(feature: GeoJsonFeature, source: 'SGC' | 'USGS'): EarthquakeInput | null {
  const properties = feature.properties ?? {};
  const coordinates = feature.geometry?.coordinates ?? [];
  const [longitude, latitude, depth] = coordinates;
  const magnitude = Number(properties.mag);
  const occurredAt = parseTime(properties.time);
  const rawId = String(feature.id ?? '').replace(/[^A-Za-z0-9_-]/g, '');

  if (
    !rawId ||
    occurredAt === null ||
    !Number.isFinite(magnitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const location = String(properties.place ?? properties.title ?? 'Ubicación desconocida')
    .trim()
    .slice(0, 200);
  const url = typeof properties.url === 'string' ? properties.url : undefined;
  const roundedMagnitude = Math.round(magnitude * 10) / 10;

  return {
    id: `${source.toLowerCase()}-${rawId}`.slice(0, 100),
    magnitude: roundedMagnitude,
    location: location || 'Ubicación desconocida',
    depthKm: Math.max(0, Math.round(Number(depth) || 0)),
    occurredAt,
    severity: severityFromMagnitude(roundedMagnitude),
    latitude,
    longitude,
    source,
    ...(url && url.startsWith('https://') ? { url } : {}),
  };
}

async function fetchSgc(): Promise<SourceResult> {
  const data = await fetchJson(SGC_FEED_URL);
  const earthquakes = (data.features ?? [])
    .map((feature) => mapFeature(feature, 'SGC'))
    .filter((item): item is EarthquakeInput => item !== null);

  if (earthquakes.length === 0) {
    throw new Error('El SGC no devolvió sismos');
  }
  return { source: 'SGC', earthquakes };
}

async function fetchUsgs(): Promise<SourceResult> {
  const start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    format: 'geojson',
    orderby: 'time',
    limit: '200',
    starttime: start,
    ...Object.fromEntries(Object.entries(COLOMBIA_BOUNDS).map(([key, value]) => [key, `${value}`])),
  });
  const data = await fetchJson(`${USGS_FEED_URL}?${params.toString()}`);
  const earthquakes = (data.features ?? [])
    .map((feature) => mapFeature(feature, 'USGS'))
    .filter((item): item is EarthquakeInput => item !== null);

  return { source: 'USGS', earthquakes };
}

/**
 * Consulta el SGC primero y, si falla, usa USGS filtrado a Colombia.
 */
export async function fetchLatestEarthquakes(): Promise<SourceResult> {
  try {
    return await fetchSgc();
  } catch {
    return fetchUsgs();
  }
}
