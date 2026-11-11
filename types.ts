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
  Sismos: undefined;
  Mapa: undefined;
  Seguridad: undefined;
  Configuracion: undefined;
  Alertas: undefined;
  Guia: undefined;
  Detalle: { id: string };
  Contactos: undefined;
  ContactosConfianza: undefined;
  Premium: undefined;
  EliminarCuenta: undefined;
  FichaMedica: undefined;
  Preparacion: undefined;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  updatedAt: number;
};

export type ContactRelation = 'Familia' | 'Pareja' | 'Amigo/a' | 'Trabajo' | 'Vecino/a' | 'Otro';

export type TrustedContact = {
  id: string;
  name: string;
  phone: string;
  relation: ContactRelation;
  /** Correo con el que la persona usa SismoAlert; permite avisarle con una notificación. */
  appEmail?: string;
  createdAt: number;
};

export type MedicalInfo = {
  bloodType: string;
  allergies: string;
  conditions: string;
  medications: string;
  healthInsurer: string;
  notes: string;
};

export type Preparedness = {
  kit: string[];
  meetingPoint: string;
  familyPlan: string;
  lastDrillAt?: number;
};

export type SafetySettings = {
  checkInEnabled: boolean;
  checkInMagnitude: string;
  checkInMinutes: number;
  notifyLinkedContacts: boolean;
};

export type CheckInStatus = 'safe' | 'help' | 'no-response';

export type CheckInTrigger = {
  earthquake: Earthquake;
  distanceKm?: number;
  drill: boolean;
  /** Si la pregunta la creó el servidor (escalada Premium). */
  serverCheckinId?: string;
  /** Fecha límite fijada por el servidor. */
  deadline?: number;
};
