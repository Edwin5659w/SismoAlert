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
import { runEarthquakeSync, useEarthquakeSyncStatus } from '../hooks/useEarthquakeSync';
import { useEarthquakes } from '../hooks/useEarthquakes';
import { LocationState, useUserLocation } from '../hooks/useUserLocation';
import {
  buildEmergencyMessage,
  notifyLinkedContacts,
} from '../lib/emergency';
import { distanceKm, parseRadiusKm, quakeDistanceKm } from '../lib/geo';
import { parseMagnitude } from '../lib/magnitude';
import { getVerifiedQuakes } from '../lib/verifiedQuakes';
import {
  cancelSafetyNotification,
  onSafetyNotificationAction,
  registerSafetyNotificationActions,
  scheduleSafetyNotification,
} from '../lib/notifications';
import {
  Presence,
  answerServerCheckin,
  savePresence,
  subscribePendingServerCheckins,
  subscribePresence,
} from '../services/premiumSafety';
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
/** Se reenvía la ubicación aproximada si te moviste más de esto o pasó este tiempo. */
const PRESENCE_MIN_MOVE_KM = 1;
const PRESENCE_MAX_AGE_MS = 3 * 60 * 60 * 1000;

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
  presence: Presence;
  setAutoEscalation: (enabled: boolean) => Promise<void>;
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
  const [presence, setPresence] = useState<Presence>({ autoEscalation: false });

  const { earthquakes, loading: earthquakesLoading, error: earthquakesError } = useEarthquakes();
  const location = useUserLocation(settings.gpsEnabled);
  const syncStatus = useEarthquakeSyncStatus();

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
      subscribePresence(uid, setPresence),
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
      if (reason === 'help' && uid && current.trigger?.serverCheckinId) {
        answerServerCheckin(uid, current.trigger.serverCheckinId, 'help').catch(() => undefined);
      }

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
    [contacts, helpMessage, safetySettings.notifyLinkedContacts, saveCheckIn, stopAlarm, uid, userName],
  );

  const begin = useCallback(
    (trigger: CheckInTrigger) => {
      if (checkInRef.current.phase === 'asking' || checkInRef.current.phase === 'escalated') return;
      const seconds = trigger.deadline
        ? Math.max(15, (trigger.deadline - Date.now()) / 1000)
        : trigger.drill
          ? DRILL_SECONDS
          : safetySettings.checkInMinutes * 60;
      setCheckIn({ phase: 'asking', trigger, deadline: Date.now() + seconds * 1000 });
      seenRef.current?.add(trigger.earthquake.id);
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

  // Detecta sismos nuevos, fuertes y cercanos (solo los confirmados por la fuente oficial).
  useEffect(() => {
    const verifiedQuakes = getVerifiedQuakes();
    if (!uid || verifiedQuakes.length === 0) return;
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

      const fresh = verifiedQuakes.filter(
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
    syncStatus.syncedAt,
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
        if (uid && current.trigger?.serverCheckinId) {
          // Detiene la escalada del servidor (llamadas a contactos).
          answerServerCheckin(uid, current.trigger.serverCheckinId, 'safe').catch(() => undefined);
        }
        setCheckIn({ ...current, phase: 'safe' });
      } else {
        setCheckIn(idleState);
      }
    },
    [escalate, saveCheckIn, stopAlarm, uid],
  );

  const dismiss = useCallback(() => {
    stopAlarm();
    setCheckIn(idleState);
  }, [stopAlarm]);

  // Preguntas creadas por el servidor (escalada Premium).
  useEffect(() => {
    if (!uid) return;
    return subscribePendingServerCheckins(uid, (items) => {
      const pending = items.sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!pending) return;
      const current = checkInRef.current;
      if (current.phase === 'asking' || current.phase === 'escalated') {
        // La app ya preguntaba por el mismo sismo: se enlaza para responderle al servidor.
        if (current.trigger && !current.trigger.serverCheckinId && current.trigger.earthquake.id === pending.quakeId) {
          setCheckIn({ ...current, trigger: { ...current.trigger, serverCheckinId: pending.id } });
        }
        return;
      }
      begin({
        earthquake: {
          id: pending.quakeId,
          magnitude: pending.magnitude,
          location: pending.place,
          depthKm: 0,
          occurredAt: pending.createdAt,
          timeAgo: 'Ahora',
          severity: pending.magnitude >= 6 ? 'Muy fuerte' : pending.magnitude >= 5 ? 'Fuerte' : 'Moderado',
        },
        distanceKm: pending.distanceKm,
        drill: false,
        serverCheckinId: pending.id,
        deadline: pending.deadline,
      });
    });
  }, [begin, uid]);

  // Botones "Estoy bien" / "Necesito ayuda" de la notificación del servidor.
  useEffect(() => {
    registerSafetyNotificationActions();
    if (!uid) return;
    return onSafetyNotificationAction((action, data) => {
      const checkinId = typeof data.checkinId === 'string' ? data.checkinId : null;
      if (!checkinId || action === 'open') return;
      answerServerCheckin(uid, checkinId, action).catch(() => undefined);
      if (checkInRef.current.trigger?.serverCheckinId === checkinId) {
        if (action === 'safe') respond('safe');
        else escalate('help');
      }
    });
  }, [escalate, respond, uid]);

  // Ubicación aproximada para la escalada en el servidor (solo con consentimiento).
  useEffect(() => {
    const here = location.location;
    if (!uid || !presence.autoEscalation || !here) return;
    const moved =
      presence.latitude === undefined || presence.longitude === undefined
        ? Infinity
        : distanceKm(here, { latitude: presence.latitude, longitude: presence.longitude });
    const stale = !presence.updatedAt || Date.now() - presence.updatedAt > PRESENCE_MAX_AGE_MS;
    if (moved > PRESENCE_MIN_MOVE_KM || stale) {
      savePresence(uid, true, here).catch((error) => console.warn('No se pudo actualizar la ubicación aproximada.', error));
    }
  }, [location.location, presence, uid]);

  const setAutoEscalation = useCallback(
    async (enabled: boolean) => {
      if (!uid) return;
      await savePresence(uid, enabled, enabled ? location.location : null);
    },
    [location.location, uid],
  );

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
      presence,
      setAutoEscalation,
    }),
    [
      presence,
      setAutoEscalation,
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
