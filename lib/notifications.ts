import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { getFirebaseDb } from './firebase';

const DEFAULT_CHANNEL = 'sismoalert-alerts';

type NotificationsModule = typeof import('expo-notifications');
type LocalNotificationsModule = Pick<
  NotificationsModule,
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
  | 'scheduleNotificationAsync'
  | 'setNotificationHandler'
  | 'cancelScheduledNotificationAsync'
>;

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function isExpoGoAndroid() {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

async function loadNotificationsModule() {
  if (isExpoGoAndroid()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').then((notifications) => {
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return notifications;
    });
  }

  return notificationsModulePromise;
}

async function loadLocalNotificationsModule(): Promise<LocalNotificationsModule | null> {
  if (isExpoGoAndroid()) {
    const [permissions, scheduler, handler, canceller] = await Promise.all([
      import('expo-notifications/build/NotificationPermissions'),
      import('expo-notifications/build/scheduleNotificationAsync'),
      import('expo-notifications/build/NotificationsHandler'),
      import('expo-notifications/build/cancelScheduledNotificationAsync'),
    ]);

    return {
      getPermissionsAsync: permissions.getPermissionsAsync,
      requestPermissionsAsync: permissions.requestPermissionsAsync,
      scheduleNotificationAsync: scheduler.scheduleNotificationAsync,
      setNotificationHandler: handler.setNotificationHandler,
      cancelScheduledNotificationAsync: canceller.cancelScheduledNotificationAsync,
    };
  }

  return loadNotificationsModule();
}

export function resolveExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    null
  );
}

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  const notifications = await loadNotificationsModule();
  if (!notifications) {
    return;
  }

  await notifications.setNotificationChannelAsync(DEFAULT_CHANNEL, {
    name: 'SismoAlert',
    importance: notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

export async function requestNotificationPermissions() {
  const notifications = await loadNotificationsModule();
  if (!notifications) {
    return false;
  }

  const { status } = await notifications.getPermissionsAsync();

  if (status === 'granted') {
    return true;
  }

  const nextStatus = await notifications.requestPermissionsAsync();
  return nextStatus.status === 'granted';
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGoAndroid()) {
    console.info(
      'El registro de notificaciones push remotas no está disponible en Expo Go para Android.',
    );
    return null;
  }

  if (!Device.isDevice) {
    console.warn('Las notificaciones push requieren un dispositivo físico.');
    return null;
  }

  await ensureNotificationChannel();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    console.warn('No se encontró un projectId de Expo para obtener el token push.');
    return null;
  }

  try {
    const notifications = await loadNotificationsModule();
    if (!notifications) {
      return null;
    }

    const token = await notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch (error) {
    console.warn('No se pudo obtener el token push.', error);
    return null;
  }
}

export async function saveExpoPushToken(uid: string, token: string) {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, 'users', uid),
    {
      expoPushToken: token,
      pushTokenUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function notifySuccessfulSignIn() {
  const notifications = await loadLocalNotificationsModule();
  if (!notifications) {
    return false;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status } = await notifications.getPermissionsAsync();
  const permission =
    status === 'granted'
      ? { status }
      : await notifications.requestPermissionsAsync();

  if (permission.status !== 'granted') {
    return false;
  }

  await notifications.scheduleNotificationAsync({
    content: {
      title: 'Sesión iniciada',
      body: 'Las notificaciones de SismoAlert están funcionando en este dispositivo.',
      data: { route: 'Inicio', type: 'login-check' },
    },
    trigger: null,
  });

  return true;
}

export function setupNotificationListeners(
  onData?: (payload: Record<string, unknown>) => void,
) {
  let cancelled = false;
  let removeListeners = () => {};

  loadNotificationsModule()
    .then((notifications) => {
      if (!notifications || cancelled) {
        return;
      }

      const receivedListener = notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        if (data) {
          onData?.(data);
        }
      });

      const responseListener = notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (data) {
          onData?.(data);
        }
      });

      removeListeners = () => {
        receivedListener.remove();
        responseListener.remove();
      };
    })
    .catch((error: unknown) => {
      console.warn('No se pudieron registrar los listeners de notificaciones.', error);
    });

  return () => {
    cancelled = true;
    removeListeners();
  };
}

export async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo enviar la push: ${response.status}`);
  }

  return response.json();
}

/**
 * Notificación local del modo "¿Estás bien?". Con `seconds` se programa a futuro,
 * así aparece aunque la app esté en segundo plano. Devuelve el id para cancelarla.
 */
export async function scheduleSafetyNotification(
  title: string,
  body: string,
  seconds?: number,
): Promise<string | null> {
  try {
    const notifications = await loadLocalNotificationsModule();
    if (!notifications) {
      return null;
    }
    const { status } = await notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const next = await notifications.requestPermissionsAsync();
      if (next.status !== 'granted') {
        return null;
      }
    }
    await ensureNotificationChannel().catch(() => undefined);
    return await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { route: 'Seguridad', type: 'safety-check' },
      },
      trigger: seconds
        ? ({ type: 'timeInterval', seconds: Math.max(1, Math.round(seconds)), channelId: DEFAULT_CHANNEL } as never)
        : null,
    });
  } catch (error) {
    console.warn('No se pudo programar la notificación de seguridad.', error);
    return null;
  }
}

export async function cancelSafetyNotification(id: string | null | undefined) {
  if (!id) {
    return;
  }
  try {
    const notifications = await loadLocalNotificationsModule();
    await notifications?.cancelScheduledNotificationAsync(id);
  } catch {
    // Si ya se mostró, no hay nada que cancelar.
  }
}

export const SAFETY_CATEGORY = 'safety-check';

/**
 * Botones "Estoy bien" / "Necesito ayuda" dentro de la propia notificación,
 * para responder sin desbloquear el celular. Abren la app para que la respuesta
 * se guarde de forma confiable.
 */
export async function registerSafetyNotificationActions() {
  try {
    const notifications = await loadNotificationsModule();
    if (!notifications) return;
    await notifications.setNotificationCategoryAsync(SAFETY_CATEGORY, [
      { identifier: 'safe', buttonTitle: 'Estoy bien', options: { opensAppToForeground: true } },
      {
        identifier: 'help',
        buttonTitle: 'Necesito ayuda',
        options: { opensAppToForeground: true, isDestructive: true },
      },
    ]);
  } catch (error) {
    console.warn('No se pudieron registrar las acciones de seguridad.', error);
  }
}

/** Escucha cuando el usuario toca un botón de la notificación de seguridad. */
export function onSafetyNotificationAction(
  handler: (action: 'safe' | 'help' | 'open', data: Record<string, unknown>) => void,
) {
  let cancelled = false;
  let remove = () => {};
  loadNotificationsModule()
    .then((notifications) => {
      if (!notifications || cancelled) return;
      const subscription = notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
        if (data.type !== 'server-checkin') return;
        const id = response.actionIdentifier;
        handler(id === 'safe' || id === 'help' ? id : 'open', data);
      });
      remove = () => subscription.remove();
    })
    .catch(() => undefined);
  return () => {
    cancelled = true;
    remove();
  };
}
