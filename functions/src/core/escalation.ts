/** Reglas de la escalada automática. Todo lo que decide "llamar o no" está aquí. */

export const ESCALATION_RULES = {
  /** Intensidad estimada mínima para preguntar (V = "fuerte, lo siente casi todo el mundo"). */
  minIntensity: 5,
  /** Ignorar sismos muy pequeños aunque la fórmula dé intensidad alta muy cerca. */
  minMagnitude: 4,
  /** Solo sismos recientes: si llegan tarde no tiene sentido preguntar. */
  maxQuakeAgeMs: 20 * 60 * 1000,
  /** Si la ubicación aproximada es más vieja que esto, no se sabe si el usuario está ahí. */
  maxPresenceAgeMs: 12 * 60 * 60 * 1000,
  /** Tiempo para responder (se usa el ajuste del usuario dentro de estos límites). */
  minMinutes: 3,
  maxMinutes: 10,
  defaultMinutes: 5,
  /** Máximo de escaladas por usuario en 24 h (evita llamadas repetidas a los contactos). */
  maxEscalationsPerDay: 2,
  /** Máximo de contactos a los que se llama. */
  maxContacts: 5,
};

export type CheckinPlan = {
  deadline: number;
  reminders: number[];
};

/** Cuándo recordar y cuándo escalar, en milisegundos desde ahora. */
export function planCheckin(now: number, userMinutes?: number): CheckinPlan {
  const minutes = Math.min(
    ESCALATION_RULES.maxMinutes,
    Math.max(ESCALATION_RULES.minMinutes, userMinutes ?? ESCALATION_RULES.defaultMinutes),
  );
  const total = minutes * 60 * 1000;
  return {
    deadline: now + total,
    reminders: [now + Math.round(total / 3), now + Math.round((2 * total) / 3)],
  };
}

export function shouldAsk(input: {
  magnitude: number;
  intensity: number;
  quakeAgeMs: number;
  presenceAgeMs: number;
}) {
  return (
    input.magnitude >= ESCALATION_RULES.minMagnitude &&
    input.intensity >= ESCALATION_RULES.minIntensity &&
    input.quakeAgeMs >= 0 &&
    input.quakeAgeMs <= ESCALATION_RULES.maxQuakeAgeMs &&
    input.presenceAgeMs <= ESCALATION_RULES.maxPresenceAgeMs
  );
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type EscalationMessageInput = {
  name: string;
  magnitude: number;
  place: string;
  mapsUrl?: string;
};

export function voiceMessage({ name, magnitude, place }: EscalationMessageInput) {
  const m = magnitude.toFixed(1).replace('.', ' punto ');
  return (
    `Hola, te llama SismoAlert con un aviso automático. ${name} no respondió después de un sismo ` +
    `de magnitud ${m} cerca de ${place}. Te enviamos por mensaje de texto su ubicación aproximada. ` +
    `Por favor intenta comunicarte con ${name}. Si no logras contactarle y crees que está en peligro, ` +
    `llama a la línea de emergencias uno, dos, tres.`
  );
}

/** TwiML de la llamada: el mensaje se repite dos veces por si no se escuchó bien. */
export function buildTwiml(input: EscalationMessageInput) {
  const say = `<Say language="es-MX">${escapeXml(voiceMessage(input))}</Say>`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${say}<Pause length="1"/>${say}</Response>`;
}

export function smsMessage({ name, magnitude, place, mapsUrl }: EscalationMessageInput) {
  return [
    `SismoAlert (aviso automático): ${name} no respondió tras un sismo M${magnitude.toFixed(1)} (${place}).`,
    mapsUrl ? `Ubicación aproximada: ${mapsUrl}` : null,
    'Intenta comunicarte. Si no logras contactarle y crees que está en peligro, llama al 123.',
  ]
    .filter(Boolean)
    .join('\n');
}
