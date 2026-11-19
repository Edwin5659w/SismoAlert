import { defineSecret, defineString } from 'firebase-functions/params';

/*
 * Secretos: se guardan en Secret Manager, nunca en el código ni en el repositorio.
 *   firebase functions:secrets:set REVENUECAT_SECRET_KEY
 */
export const REVENUECAT_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY');
export const REVENUECAT_WEBHOOK_AUTH = defineSecret('REVENUECAT_WEBHOOK_AUTH');
export const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
export const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');

/* Parámetros no secretos (se piden al desplegar o van en functions/.env). */
export const TWILIO_FROM_NUMBER = defineString('TWILIO_FROM_NUMBER', {
  description: 'Número de Twilio en formato E.164 (ej. +15551234567)',
});
/** "true" = no llama ni envía SMS de verdad; solo registra lo que haría. */
export const TWILIO_DRY_RUN = defineString('TWILIO_DRY_RUN', { default: 'true' });

export const PREMIUM_ENTITLEMENT = 'premium';
export const REGION = 'us-central1';
