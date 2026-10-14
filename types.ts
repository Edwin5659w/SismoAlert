export type Severity = 'Leve' | 'Moderado' | 'Fuerte' | 'Muy fuerte';

export type Earthquake = {
  id: string;
  magnitude: number;
  location: string;
  depthKm: number;
  occurredAt: number;
  timeAgo: string;
  severity: Severity;
  latitude?: number;
  longitude?: number;
  source?: string;
  url?: string;
};

export type EarthquakeInput = {
  id: string;
  magnitude: number;
  location: string;
  depthKm: number;
  occurredAt: number;
  severity: Severity;
  latitude: number;
  longitude: number;
  source: string;
  url?: string;
};

export type SyncStatus = {
  state: 'idle' | 'syncing' | 'ok' | 'error';
  source?: string;
  count?: number;
  syncedAt?: number;
  message?: string;
};

export type UserSettings = {
  alertsEnabled: boolean;
  importantAlerts: boolean;
  minMagnitude: string;
  gpsEnabled: boolean;
  alertRadius: string;
};

export type RootTabParamList = {
  Inicio: undefined;
  Configuracion: undefined;
  Sismos: undefined;
  Mapa: undefined;
  Alertas: undefined;
  Guia: undefined;
  Detalle: { id: string };
  Contactos: undefined;
};
