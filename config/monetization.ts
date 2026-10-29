import { Platform } from 'react-native';

/**
 * Configuración de monetización. Todo lo que está aquí es público: las claves
 * secretas (RevenueCat secret key, Twilio) viven solo en Cloud Functions.
 */

/** Identificador del entitlement configurado en RevenueCat. */
export const PREMIUM_ENTITLEMENT = 'premium';

export const revenueCatApiKey =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  }) ?? '';

// Bloques de prueba oficiales de Google (no generan ingresos ni sanciones).
const TEST_UNITS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2435281174',
    default: 'ca-app-pub-3940256099942544/9214589741',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }),
};

function unit(kind: 'banner' | 'interstitial') {
  const configured =
    kind === 'banner'
      ? Platform.select({
          ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
          android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
        })
      : Platform.select({
          ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
          android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
        });
  // En desarrollo SIEMPRE se usan anuncios de prueba: hacer clic en anuncios reales
  // propios puede hacer que AdMob suspenda la cuenta.
  if (__DEV__ || !configured) return TEST_UNITS[kind];
  return configured;
}

export const adUnits = {
  get banner() {
    return unit('banner');
  },
  get interstitial() {
    return unit('interstitial');
  },
};

/** Reglas de frecuencia para no saturar al usuario. */
export const adPolicy = {
  /** Tiempo mínimo entre anuncios de pantalla completa. */
  interstitialCooldownMs: 4 * 60 * 1000,
  /** No mostrar pantalla completa en los primeros minutos de la sesión. */
  interstitialGraceMs: 2 * 60 * 1000,
  /** Cuántas "oportunidades" (p. ej. abrir detalles) antes de mostrar uno. */
  interstitialEveryNOpportunities: 3,
};

export const premiumBenefits = [
  {
    icon: 'call' as const,
    title: 'Llamada automática a tus contactos',
    text: 'Si no respondes tras un sismo fuerte, nuestro servidor llama y envía SMS a tus contactos, aunque tu celular esté sin batería o la app cerrada.',
  },
  {
    icon: 'eye-off' as const,
    title: 'Sin anuncios',
    text: 'Usa SismoAlert sin interrupciones.',
  },
  {
    icon: 'notifications' as const,
    title: 'Recordatorios insistentes',
    text: 'Varias alertas antes de escalar, para evitar falsas alarmas.',
  },
  {
    icon: 'heart' as const,
    title: 'Apoyas el proyecto',
    text: 'Las funciones básicas de seguridad siempre serán gratis.',
  },
];
