import { logger } from 'firebase-functions';

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Muestra los botones "Estoy bien" / "Necesito ayuda". */
  categoryId?: string;
};

/** Envía notificaciones con el servicio de Expo (mismo canal que usa la app). */
export async function sendPush(messages: PushMessage[]) {
  const valid = messages.filter((message) => /^Expo(nent)?PushToken\[.+\]$/.test(message.to));
  if (valid.length === 0) return 0;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(
        valid.map((message) => ({
          ...message,
          sound: 'default',
          priority: 'high',
          channelId: 'sismoalert-alerts',
          interruptionLevel: 'time-sensitive',
        })),
      ),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      logger.warn('Expo push respondió con error', { status: response.status });
      return 0;
    }
    return valid.length;
  } catch (error) {
    logger.warn('No se pudo enviar la notificación push', error);
    return 0;
  }
}
