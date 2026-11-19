import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { REGION, REVENUECAT_SECRET_KEY, REVENUECAT_WEBHOOK_AUTH } from '../config';
import { isFirebaseUid, safeEqual } from '../core/entitlement';
import { syncEntitlement } from '../services/entitlements';

/**
 * Webhook de RevenueCat. En el panel de RevenueCat → Integrations → Webhooks,
 * configura esta URL y en "Authorization header" el mismo valor del secreto
 * REVENUECAT_WEBHOOK_AUTH.
 *
 * No se confía en el contenido del evento: solo se usa para saber QUÉ usuario
 * cambió, y su estado real se consulta a la API de RevenueCat.
 */
export const revenuecatWebhook = onRequest(
  { region: REGION, secrets: [REVENUECAT_SECRET_KEY, REVENUECAT_WEBHOOK_AUTH], maxInstances: 5 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    const header = req.get('authorization') ?? '';
    if (!safeEqual(header, REVENUECAT_WEBHOOK_AUTH.value())) {
      logger.warn('Webhook de RevenueCat con autorización inválida');
      res.status(401).send('Unauthorized');
      return;
    }

    const event = (req.body as { event?: Record<string, unknown> })?.event ?? {};
    const candidates = [
      event.app_user_id,
      event.original_app_user_id,
      ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
      ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
    ];
    const uids = [...new Set(candidates.filter(isFirebaseUid))];

    try {
      for (const uid of uids) {
        const record = await syncEntitlement(uid, REVENUECAT_SECRET_KEY.value(), `webhook:${String(event.type ?? '')}`);
        logger.info('Suscripción sincronizada', { uid, premium: record.premium, type: event.type });
      }
      res.status(200).json({ ok: true, users: uids.length });
    } catch (error) {
      // 500 = RevenueCat reintenta más tarde.
      logger.error('No se pudo sincronizar la suscripción', error);
      res.status(500).json({ ok: false });
    }
  },
);

const REFRESH_COOLDOWN_MS = 10 * 1000;

/** La app lo llama justo después de comprar o restaurar, por si el webhook tarda. */
export const refreshEntitlement = onCall(
  { region: REGION, secrets: [REVENUECAT_SECRET_KEY], maxInstances: 10 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión para continuar.');

    // Límite simple de frecuencia por usuario.
    const throttle = getFirestore().doc(`entitlementRefresh/${uid}`);
    const allowed = await getFirestore().runTransaction(async (tx) => {
      const last = (await tx.get(throttle)).data()?.at;
      if (last instanceof Timestamp && Date.now() - last.toMillis() < REFRESH_COOLDOWN_MS) return false;
      tx.set(throttle, { at: FieldValue.serverTimestamp() });
      return true;
    });
    if (!allowed) throw new HttpsError('resource-exhausted', 'Espera unos segundos e inténtalo de nuevo.');

    try {
      const record = await syncEntitlement(uid, REVENUECAT_SECRET_KEY.value(), 'app-refresh');
      return { premium: record.premium };
    } catch (error) {
      logger.error('refreshEntitlement falló', error);
      throw new HttpsError('unavailable', 'No pudimos confirmar tu suscripción. Inténtalo más tarde.');
    }
  },
);
