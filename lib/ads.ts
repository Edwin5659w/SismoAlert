import { hasNativeModule } from './nativeModules';

type AdsModule = typeof import('react-native-google-mobile-ads');

let cached: AdsModule | null | undefined;

/**
 * Carga AdMob solo si el binario lo incluye (development build / APK).
 * En Expo Go devuelve null y la app simplemente no muestra anuncios.
 */
export function loadAdsModule(): AdsModule | null {
  if (cached !== undefined) return cached;
  if (!hasNativeModule('RNGoogleMobileAdsModule')) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-google-mobile-ads') as AdsModule;
  } catch (error) {
    console.warn('AdMob no está disponible en este binario.', error);
    cached = null;
  }
  return cached;
}

export type ConsentResult = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
};

/** Pide el consentimiento (UMP / GDPR) ANTES de inicializar el SDK, como exige Google. */
export async function gatherConsentAndInitialize(): Promise<ConsentResult> {
  const ads = loadAdsModule();
  if (!ads) return { canRequestAds: false, privacyOptionsRequired: false };

  let canRequestAds = false;
  let privacyOptionsRequired = false;
  try {
    const info = await ads.AdsConsent.gatherConsent();
    canRequestAds = info.canRequestAds;
    privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch (error) {
    // Si falla el formulario, se usa lo que ya se haya otorgado antes.
    try {
      const info = await ads.AdsConsent.getConsentInfo();
      canRequestAds = info.canRequestAds;
    } catch {
      canRequestAds = false;
    }
    console.warn('No se pudo actualizar el consentimiento de anuncios.', error);
  }

  if (canRequestAds) {
    await ads.default().setRequestConfiguration({
      // App de emergencias para todo público: contenido apto para todos.
      maxAdContentRating: ads.MaxAdContentRating.G,
    });
    await ads.default().initialize();
  }
  return { canRequestAds, privacyOptionsRequired };
}

export async function showPrivacyOptions() {
  const ads = loadAdsModule();
  if (!ads) return;
  try {
    await ads.AdsConsent.showPrivacyOptionsForm();
  } catch (error) {
    console.warn('No se pudo abrir el formulario de privacidad.', error);
  }
}
