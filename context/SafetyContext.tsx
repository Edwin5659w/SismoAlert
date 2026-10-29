import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Vibration } from 'react-native';
import { runEarthquakeSync } from '../hooks/useEarthquakeSync';
import { useEarthquakes } from '../hooks/useEarthquakes';
import { LocationState, useUserLocation } from '../hooks/useUserLocation';
import {
  buildEmergencyMessage,
  notifyLinkedContacts,
} from '../lib/emergency';
import { parseRadiusKm, quakeDistanceKm } from '../lib/geo';
import { parseMagnitude } from '../lib/magnitude';
import { cancelSafetyNotification, scheduleSafetyNotification } from '../lib/notifications';
import {
  defaultSafetySettings,
  emptyPreparedness,
  recordCheckIn,
  savePreparedness,
  subscribeMedicalInfo,
  subscribePreparedness,
  subscribeSafetySettings,
  subscribeTrustedContacts,
} from '../services/safety';
import { defaultSettings, subscribeUserSettings } from '../services/userSettings';
import {
  CheckInStatus,
  CheckInTrigger,
  Earthquake,
  MedicalInfo,
  Preparedness,
  SafetySettings,
  TrustedContact,
  UserSettings,
} from '../types';
import { useAuth } from './AuthContext';

const SEEN_KEY = 'sismoalert:checked-quakes';
/** Solo se pregunta por sismos ocurridos en los últimos 30 minutos. */
const RECENT_WINDOW_MS = 30 * 60 * 1000;
/** Sin ubicación no sabemos la distancia: solo se pregunta por sismos muy fuertes. */
const NO_LOCATION_MAGNITUDE = 6;
const DRILL_SECONDS = 30;
const SYNC_EVERY_MS = 60 * 1000;
const ALARM_PATTERN = [0, 700, 500, 700, 500];

export type CheckInPhase = 'idle' | 'asking' | 'escalated' | 'safe' | 'sos';

export type CheckInState = {
  phase: CheckInPhase;
  trigger: CheckInTrigger | null;
  deadline: number;
  reason?: 'help' | 'no-response';
  notifiedCount?: number;
};

type SafetyContextValue = {
  userName: string;
  settings: UserSettings;
  safetySettings: SafetySettings;
  contacts: TrustedContact[];
  medical: MedicalInfo | null;
  preparedness: Preparedness;
  earthquakes: Earthquake[];
  earthquakesLoading: boolean;
  earthquakesError: string;
  location: LocationState & { refresh: () => Promise<void> | undefined };
  checkIn: CheckInState;
  startDrill: () => void;
  openSos: () => void;
  respond: (status: 'safe' | 'help') => void;
  dismiss: () => void;
  helpMessage: (kind: 'help' | 'safe' | 'no-response') => string;
};

const SafetyContext = createContext<SafetyContextValue | undefined>(undefined);

const idleState: CheckInState = { phase: 'idle', trigger: null, deadline: 0 };

export function SafetyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(defaultSafetySettings);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [medical, setMedical] = useState<MedicalInfo | null>(null);
  const [preparedness, setPreparedness] = useState<Preparedness>(emptyPreparedness);
  const [checkIn, setCheckIn] = useState<CheckInState>(idleState);

  const { earthquakes, loading: earthquakesLoading, error: earthquakesError } = useEarthquakes();
  const location = useUserLocation(settings.gpsEnabled);

  const seenRef = useRef<Set<string> | null>(null);
  const notificationRef = useRef<string | null>(null);
  const checkInRef = useRef(checkIn);
  checkInRef.current = checkIn;

  // Datos del usuario en Firestore.
  useEffect(() => {
    if (!uid) return;
    const unsubscribers = [
      subscribeUserSettings(uid, setSettings),
      subscribeSafetySettings(uid, setSafetySettings),
      subscribeTrustedContacts(uid, setContacts),
      subscribeMedicalInfo(uid, setMedical),
      subscribePreparedness(uid, setPreparedness),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  // Mientras la app está abierta, revisa la fuente de sismos con frecuencia.
  useEffect(() => {
    if (!uid) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') runEarthquakeSync();
    }, SYNC_EVERY_MS);
    return () => clearInterval(timer);
  }, [uid]);

  const helpMessage = useCallback(
    (kind: 'help' | 'safe' | 'no-response') =>
      buildEmergencyMessage({
        name: userName,
        kind,
        location: location.location,
        earthquake: checkInRef.current.trigger?.earthquake,
        drill: checkInRef.current.trigger?.drill,
      }),
    [location.location, userName],
  );

  const stopAlarm = useCallback(() => {
    Vibration.cancel();
    cancelSafetyNotification(notificationRef.current);
    notificationRef.current = null;
  }, []);

  const saveCheckIn = useCallback(
    (status: CheckInStatus, trigger: CheckInTrigger | null) => {
      if (!uid || !trigger) return;
      recordCheckIn(uid, {
        status,
        drill: trigger.drill,
        earthquakeId: trigger.earthquake.id,
        magnitude: trigger.earthquake.magnitude,
        place: trigger.earthquake.location,
        distanceKm: trigger.distanceKm,
        latitude: location.location?.latitude,
        longitude: location.location?.longitude,
      }).catch((error) => console.warn('No se pudo guardar el registro de seguridad.', error));
    },
    [location.location, uid],
  );

  const escalate = useCallback(
    async (reason: 'help' | 'no-response') => {
      const current = checkInRef.current;
      if (current.phase !== 'asking') return;
      stopAlarm();
      setCheckIn({ ...current, phase: 'escalated', reason });
      saveCheckIn(reason, current.trigger);

      if (reason === 'no-response') {
        scheduleSafetyNotification(
          'No respondiste a "¿Estás bien?"',
          'Abre SismoAlert para pedir ayuda o avisar que estás bien.',
        );
      }

      if (safetySettings.notifyLinkedContacts && contacts.some((contact) => contact.appEmail)) {
        const drill = current.trigger?.drill ? '[Simulacro] ' : '';
        const title =
          reason === 'help' ? `${drill}${userName} pidió ayuda` : `${drill}${userName} no respondió`;
        const count = await notifyLinkedContacts(contacts, title, helpMessage(reason));
        setCheckIn((state) =>
          state.phase === 'escalated' ? { ...state, notifiedCount: count } : state,
        );
      }
    },
    [contacts, helpMessage, safetySettings.notifyLinkedContacts, saveCheckIn, stopAlarm, userName],
  );

  const begin = useCallback(
    (trigger: CheckInTrigger) => {
      if (checkInRef.current.phase === 'asking' || checkInRef.current.phase === 'escalated') return;
      const seconds = trigger.drill ? DRILL_SECONDS : safetySettings.checkInMinutes * 60;
      setCheckIn({ phase: 'asking', trigger, deadline: Date.now() + seconds * 1000 });
      Vibration.vibrate(ALARM_PATTERN, true);
      const prefix = trigger.drill ? 'Simulacro: ' : '';
      scheduleSafetyNotification(
        `${prefix}¿Estás bien?`,
        `Sismo M${trigger.earthquake.magnitude.toFixed(1)} · ${trigger.earthquake.location}. Toca para responder.`,
      );
      // Recordatorio al vencer el tiempo, por si la app quedó en segundo plano.
      scheduleSafetyNotification(
        `${prefix}Aún no respondes`,
        'Abre SismoAlert y confirma si estás bien.',
        seconds,
      ).then((id) => {
        notificationRef.current = id;
      });
    },
    [safetySettings.checkInMinutes],
  );

  // Cuenta regresiva: si se acaba el tiempo, se escala automáticamente.
  useEffect(() => {
    if (checkIn.phase !== 'asking') return;
    const check = () => {
      if (Date.now() >= checkInRef.current.deadline) escalate('no-response');
    };
    const timer = setInterval(check, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [checkIn.phase, escalate]);

  // Detecta sismos nuevos, fuertes y cercanos.
  useEffect(() => {
    if (!uid || earthquakes.length === 0) return;
    let cancelled = false;

    (async () => {
      if (!seenRef.current) {
        try {
          const raw = await AsyncStorage.getItem(SEEN_KEY);
          seenRef.current = new Set(raw ? (JSON.parse(raw) as string[]) : []);
        } catch {
          seenRef.current = new Set();
        }
      }
      if (cancelled) return;
      const seen = seenRef.current;
      const now = Date.now();
      const threshold = parseMagnitude(safetySettings.checkInMagnitude);
      const radius = parseRadiusKm(settings.alertRadius);

      const fresh = earthquakes.filter(
        (item) => !seen.has(item.id) && now - item.occurredAt <= RECENT_WINDOW_MS,
      );
      if (fresh.length === 0) return;
      fresh.forEach((item) => seen.add(item.id));
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200))).catch(() => undefined);

      if (!settings.alertsEnabled || !safetySettings.checkInEnabled) return;

      const candidates = fresh
        .map((earthquake) => ({
          earthquake,
          distanceKm: quakeDistanceKm(earthquake, location.location),
        }))
        .filter(({ earthquake, distanceKm }) =>
          distanceKm === undefined
            ? earthquake.magnitude >= Math.max(threshold, NO_LOCATION_MAGNITUDE)
            : earthquake.magnitude >= threshold && distanceKm <= radius,
        )
        .sort((a, b) => b.earthquake.magnitude - a.earthquake.magnitude);

      if (candidates[0]) begin({ ...candidates[0], drill: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    begin,
    earthquakes,
    location.location,
    safetySettings.checkInEnabled,
    safetySettings.checkInMagnitude,
    settings.alertRadius,
    settings.alertsEnabled,
    uid,
  ]);

  const startDrill = useCallback(() => {
    const drillQuake: Earthquake = {
      id: `simulacro-${Date.now()}`,
      magnitude: 6.1,
      location: 'Simulacro de sismo',
      depthKm: 30,
      occurredAt: Date.now(),
      timeAgo: 'Ahora',
      severity: 'Muy fuerte',
      latitude: location.location?.latitude,
      longitude: location.location?.longitude,
    };
    begin({ earthquake: drillQuake, distanceKm: 0, drill: true });
    if (uid) {
      savePreparedness(uid, { ...preparedness, lastDrillAt: Date.now() }).catch(() => undefined);
    }
  }, [begin, location.location, preparedness, uid]);

  const openSos = useCallback(() => {
    if (checkInRef.current.phase === 'asking') {
      escalate('help');
      return;
    }
    setCheckIn((state) => (state.phase === 'escalated' ? state : { ...idleState, phase: 'sos' }));
    location.refresh();
  }, [escalate, location]);

  const respond = useCallback(
    (status: 'safe' | 'help') => {
      const current = checkInRef.current;
      if (status === 'help') {
        if (current.phase === 'asking') escalate('help');
        return;
      }
      stopAlarm();
      if (current.phase === 'asking' || current.phase === 'escalated') {
        saveCheckIn('safe', current.trigger);
        setCheckIn({ ...current, phase: 'safe' });
      } else {
        setCheckIn(idleState);
      }
    },
    [escalate, saveCheckIn, stopAlarm],
  );

  const dismiss = useCallback(() => {
    stopAlarm();
    setCheckIn(idleState);
  }, [stopAlarm]);

  useEffect(() => () => Vibration.cancel(), []);

  const value = useMemo<SafetyContextValue>(
    () => ({
      userName,
      settings,
      safetySettings,
      contacts,
      medical,
      preparedness,
      earthquakes,
      earthquakesLoading,
      earthquakesError,
      location,
      checkIn,
      startDrill,
      openSos,
      respond,
      dismiss,
      helpMessage,
    }),
    [
      checkIn,
      contacts,
      dismiss,
      earthquakes,
      earthquakesError,
      earthquakesLoading,
      helpMessage,
      location,
      medical,
      openSos,
      preparedness,
      respond,
      safetySettings,
      settings,
      startDrill,
      userName,
    ],
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety debe usarse dentro de SafetyProvider');
  }
  return context;
}
