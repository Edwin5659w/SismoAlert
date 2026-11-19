import { getFunctions } from 'firebase-admin/functions';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import {
  REGION,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_DRY_RUN,
  TWILIO_FROM_NUMBER,
} from '../config';
import {
  ESCALATION_RULES,
  buildTwiml,
  planCheckin,
  shouldAsk,
  smsMessage,
} from '../core/escalation';
import { estimateIntensity, surfaceDistanceKm } from '../core/geo';
import { toE164 } from '../core/phone';
import { Quake, fetchRecentQuakes } from '../core/quakes';
import { isPremium } from '../services/entitlements';
import { sendPush } from '../services/push';
import { placeCall, sendSms } from '../services/twilio';

/*
 * Escalada automática Premium. El reloj vive en el servidor:
 *
 *   quakeWatcher (cada 2 min) ─► sismo fuerte cerca de un usuario Premium con consentimiento
 *       └─► crea users/{uid}/serverCheckins/{id} (pending) + push "¿Estás bien?"
 *           └─► Cloud Tasks: recordatorio, recordatorio, revisión final
 *                 └─► sigue "pending" y sigue siendo Premium ─► Twilio llama y envía SMS
 *                     a los contactos de confianza (NUNCA al 123).
 */

type TickPayload = { uid: string; checkinId: string; step: 'reminder' | 'final' };

const db = () => getFirestore();

function enqueue(payload: TickPayload, at: number) {
  return getFunctions()
    .taskQueue<TickPayload>(`locations/${REGION}/functions/checkinTick`)
    .enqueue(payload, { scheduleTime: new Date(at) });
}

async function askUser(uid: string, quake: Quake, distanceKm: number, intensity: number) {
  const userRef = db().doc(`users/${uid}`);
  const [user, safety, pending] = await Promise.all([
    userRef.get(),
    userRef.collection('private').doc('safety').get(),
    userRef.collection('serverCheckins').where('status', '==', 'pending').limit(1).get(),
  ]);
  // Una pregunta a la vez, y respeta si el usuario apagó el modo "¿Estás bien?".
  if (!pending.empty || safety.data()?.checkInEnabled === false) return false;

  const plan = planCheckin(Date.now(), safety.data()?.checkInMinutes);
  // ID determinista: si la función corre dos veces, no se duplica la pregunta.
  const checkinRef = userRef.collection('serverCheckins').doc(quake.id);
  try {
    await checkinRef.create({
      status: 'pending',
      quakeId: quake.id,
      magnitude: quake.magnitude,
      place: quake.place,
      distanceKm: Math.round(distanceKm),
      intensity,
      deadline: Timestamp.fromMillis(plan.deadline),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    return false; // ya existía
  }

  const token = user.data()?.expoPushToken;
  if (typeof token === 'string') {
    await sendPush([
      {
        to: token,
        title: '¿Estás bien?',
        body: `Sismo M${quake.magnitude.toFixed(1)} · ${quake.place}. Responde para que no avisemos a tus contactos.`,
        categoryId: 'safety-check',
        data: { type: 'server-checkin', checkinId: checkinRef.id, route: 'Seguridad' },
      },
    ]);
  }

  await Promise.all([
    ...plan.reminders.map((at) => enqueue({ uid, checkinId: checkinRef.id, step: 'reminder' }, at)),
    enqueue({ uid, checkinId: checkinRef.id, step: 'final' }, plan.deadline),
  ]);
  return true;
}

export const quakeWatcher = onSchedule(
  { region: REGION, schedule: 'every 2 minutes', timeZone: 'America/Bogota', maxInstances: 1 },
  async () => {
    const now = Date.now();
    const quakes = (await fetchRecentQuakes()).filter(
      (quake) =>
        quake.magnitude >= ESCALATION_RULES.minMagnitude &&
        now - quake.occurredAt <= ESCALATION_RULES.maxQuakeAgeMs,
    );
    if (quakes.length === 0) return;

    const presences = await db().collection('presence').where('autoEscalation', '==', true).get();

    for (const quake of quakes) {
      // Cada sismo se procesa una sola vez.
      try {
        await db().doc(`serverEvents/${quake.id}`).create({ processedAt: FieldValue.serverTimestamp() });
      } catch {
        continue;
      }

      let asked = 0;
      for (const presence of presences.docs) {
        const data = presence.data();
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') continue;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0;
        const distanceKm = surfaceDistanceKm(
          { latitude: data.latitude, longitude: data.longitude },
          { latitude: quake.latitude, longitude: quake.longitude },
        );
        const intensity = estimateIntensity(quake.magnitude, distanceKm, quake.depthKm);
        if (
          !shouldAsk({
            magnitude: quake.magnitude,
            intensity,
            quakeAgeMs: now - quake.occurredAt,
            presenceAgeMs: now - updatedAt,
          })
        ) {
          continue;
        }
        // La validación Premium SIEMPRE se hace en el servidor.
        if (!(await isPremium(presence.id))) continue;
        try {
          if (await askUser(presence.id, quake, distanceKm, intensity)) asked += 1;
        } catch (error) {
          logger.error('No se pudo crear la pregunta de seguridad', { uid: presence.id, error });
        }
      }
      logger.info('Sismo procesado', { quake: quake.id, magnitude: quake.magnitude, asked });
    }
  },
);

/** Reserva una escalada dentro del límite diario (transacción, sin índices extra). */
async function takeEscalationQuota(uid: string) {
  const ref = db().doc(`escalationQuota/${uid}`);
  return db().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const now = Date.now();
    const windowStart = data?.windowStart instanceof Timestamp ? data.windowStart.toMillis() : 0;
    const inWindow = now - windowStart < 24 * 60 * 60 * 1000;
    const count = inWindow ? Number(data?.count ?? 0) : 0;
    if (count >= ESCALATION_RULES.maxEscalationsPerDay) return false;
    tx.set(ref, {
      windowStart: inWindow ? data?.windowStart : Timestamp.fromMillis(now),
      count: count + 1,
    });
    return true;
  });
}

async function escalate(uid: string, checkinRef: FirebaseFirestore.DocumentReference) {
  const checkin = (await checkinRef.get()).data() ?? {};
  const [user, contactsSnap, presence] = await Promise.all([
    db().doc(`users/${uid}`).get(),
    db().collection(`users/${uid}/contacts`).limit(ESCALATION_RULES.maxContacts).get(),
    db().doc(`presence/${uid}`).get(),
  ]);
  const name = String(user.data()?.name ?? 'Tu contacto').slice(0, 60);
  const lat = presence.data()?.latitude;
  const lng = presence.data()?.longitude;
  const message = {
    name,
    magnitude: Number(checkin.magnitude ?? 0),
    place: String(checkin.place ?? 'Colombia'),
    mapsUrl: typeof lat === 'number' && typeof lng === 'number' ? `https://maps.google.com/?q=${lat},${lng}` : undefined,
  };

  const twilio = {
    accountSid: TWILIO_ACCOUNT_SID.value(),
    authToken: TWILIO_AUTH_TOKEN.value(),
    from: TWILIO_FROM_NUMBER.value(),
    dryRun: TWILIO_DRY_RUN.value() !== 'false' || process.env.FUNCTIONS_EMULATOR === 'true',
  };
  const twiml = buildTwiml(message);
  const sms = smsMessage(message);

  const results = [];
  for (const contact of contactsSnap.docs) {
    const to = toE164(String(contact.data().phone ?? ''));
    if (!to) {
      results.push({ contactId: contact.id, skipped: 'número inválido' });
      continue;
    }
    const [call, text] = await Promise.all([placeCall(twilio, to, twiml), sendSms(twilio, to, sms)]);
    results.push({ contactId: contact.id, call, sms: text });
  }

  // Aviso por la app a los contactos que también usan SismoAlert.
  const linkedTokens = await Promise.all(
    contactsSnap.docs
      .map((contact) => contact.data().appEmail)
      .filter((email): email is string => typeof email === 'string')
      .map(async (email) => (await db().doc(`publicProfiles/${email}`).get()).data()?.expoPushToken),
  );
  const pushed = await sendPush(
    linkedTokens
      .filter((token): token is string => typeof token === 'string')
      .map((to) => ({ to, title: `${name} no respondió tras un sismo`, body: sms, data: { type: 'contact-alert' } })),
  );

  const anyDelivered = results.some((item) => 'call' in item && (item.call?.ok || item.sms?.ok)) || pushed > 0;
  await checkinRef.update({
    status: 'escalated',
    escalatedAt: FieldValue.serverTimestamp(),
    contactsReached: anyDelivered,
  });
  // Registro de auditoría (solo servidor): útil para depurar y como respaldo.
  await db().collection('escalations').add({
    uid,
    checkinId: checkinRef.id,
    results,
    pushed,
    dryRun: twilio.dryRun,
    createdAt: FieldValue.serverTimestamp(),
  });
  logger.info('Escalada ejecutada', { uid, contacts: results.length, pushed, dryRun: twilio.dryRun });
}

export const checkinTick = onTaskDispatched<TickPayload>(
  {
    region: REGION,
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN],
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 20 },
    rateLimits: { maxConcurrentDispatches: 20 },
  },
  async (request) => {
    const { uid, checkinId, step } = request.data;
    const checkinRef = db().doc(`users/${uid}/serverCheckins/${checkinId}`);
    const snapshot = await checkinRef.get();
    if (snapshot.data()?.status !== 'pending') return; // ya respondió o ya se escaló

    if (step === 'reminder') {
      const token = (await db().doc(`users/${uid}`).get()).data()?.expoPushToken;
      if (typeof token === 'string') {
        await sendPush([
          {
            to: token,
            title: 'Aún no respondes: ¿estás bien?',
            body: 'Si no respondes pronto, llamaremos a tus contactos de confianza.',
            categoryId: 'safety-check',
            data: { type: 'server-checkin', checkinId, route: 'Seguridad' },
          },
        ]);
      }
      return;
    }

    // Paso final: marcar "escalating" en una transacción evita llamar dos veces si la tarea se repite.
    const claimed = await db().runTransaction(async (tx) => {
      const current = await tx.get(checkinRef);
      if (current.data()?.status !== 'pending') return false;
      tx.update(checkinRef, { status: 'escalating' });
      return true;
    });
    if (!claimed) return;

    if (!(await isPremium(uid))) {
      await checkinRef.update({ status: 'expired', reason: 'sin suscripción activa' });
      return;
    }
    if (!(await takeEscalationQuota(uid))) {
      await checkinRef.update({ status: 'expired', reason: 'límite diario de escaladas' });
      return;
    }
    try {
      await escalate(uid, checkinRef);
    } catch (error) {
      // No se reintenta: podría repetir llamadas que ya se hicieron.
      logger.error('La escalada falló', { uid, checkinId, error });
      await checkinRef.update({ status: 'failed' }).catch(() => undefined);
    }
  },
);
