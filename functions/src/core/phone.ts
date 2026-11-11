/**
 * Convierte un número guardado por la app al formato E.164 que exige Twilio.
 * La app guarda dígitos y, opcionalmente, un "+" inicial.
 * Números colombianos sin indicativo (10 dígitos que empiezan por 3 = celular,
 * o fijos de 10 dígitos que empiezan por 60) se completan con +57.
 * Devuelve null si el número no es utilizable o es una línea de emergencia.
 */
const EMERGENCY_SHORT_CODES = new Set(['123', '112', '119', '132', '144', '911']);

export function toE164(raw: string, defaultCountryCode = '57'): string | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits || EMERGENCY_SHORT_CODES.has(digits)) return null;

  let e164: string;
  if (hasPlus) {
    e164 = `+${digits}`;
  } else if (digits.startsWith(defaultCountryCode) && digits.length === defaultCountryCode.length + 10) {
    e164 = `+${digits}`;
  } else if (digits.length === 10 && (digits.startsWith('3') || digits.startsWith('60'))) {
    e164 = `+${defaultCountryCode}${digits}`;
  } else {
    return null;
  }

  // E.164: máximo 15 dígitos, mínimo razonable 8.
  const count = e164.length - 1;
  return count >= 8 && count <= 15 ? e164 : null;
}
