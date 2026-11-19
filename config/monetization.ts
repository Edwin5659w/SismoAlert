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

/**
 * Premium (suscripción + escalada por llamada) se activa solo cuando está configurado:
 * EXPO_PUBLIC_PREMIUM_ENABLED=true y la clave de RevenueCat. Mientras tanto la app
 * no muestra planes ni botones de compra (primera versión gratuita).
 */
export const premiumEnabled =
  process.env.EXPO_PUBLIC_PREMIUM_ENABLED === 'true' && Boolean(revenueCatApiKey);

// Bloque de banner de prueba oficial de Google (no genera ingresos ni sanciones).
const TEST_BANNER = Platform.select({
  ios: 'ca-app-pub-3940256099942544/2435281174',
  default: 'ca-app-pub-3940256099942544/9214589741',
});

/**
 * Bloque del banner. En desarrollo SIEMPRE el de prueba (hacer clic en anuncios
 * reales propios puede suspender la cuenta de AdMob). En producción, si no hay
 * un bloque real configurado, no se muestra ningún anuncio.
 */
export function bannerUnitId(): string | null {
  const configured = Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
  });
  if (__DEV__) return TEST_BANNER ?? null;
  return configured || null;
}

export const premiumBenefits = [
  {
    icon: 'call' as const,
    title: 'Llamada automática a tus contactos',
    text: 'Si no respondes tras un sismo fuerte, nuestro servidor llama y envía SMS a tus contactos, aunque tu celular esté sin batería o la app cerrada.',
  },
  {
    icon: 'eye-off' as const,
    title: 'Sin anuncios',
    text: 'Quita el banner de publicidad.',
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
