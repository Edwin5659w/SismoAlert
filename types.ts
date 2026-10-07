export type Severity = 'Leve' | 'Moderado' | 'Fuerte' | 'Muy fuerte';

export type Earthquake = {
  id: string;
  magnitude: number;
  location: string;
  depthKm: number;
  occurredAt: number;
  timeAgo: string;
  severity: Severity;
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
};
