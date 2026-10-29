import { adPolicy, adUnits } from '../config/monetization';
import { hasNativeModule } from './nativeModules';

type AdsModule = typeof import('react-native-google-mobile-ads');
type Interstitial = ReturnType<AdsModule['InterstitialAd']['createForAdRequest']>;

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

/**
 * Anuncio de pantalla completa con límites de frecuencia.
 * La pantalla solo "avisa" que hubo una oportunidad (p. ej. abrir un detalle);
 * el gestor decide si corresponde mostrar algo.
 */
export class InterstitialManager {
  private ad: Interstitial | null = null;
  private loaded = false;
  private opportunities = 0;
  private lastShownAt = 0;
  private readonly startedAt = Date.now();
  private unsubscribers: (() => void)[] = [];

  constructor(private readonly ads: AdsModule) {}

  start() {
    if (this.ad) return;
    const { AdEventType, InterstitialAd } = this.ads;
    this.ad = InterstitialAd.createForAdRequest(adUnits.interstitial);
    this.unsubscribers = [
      this.ad.addAdEventListener(AdEventType.LOADED, () => {
        this.loaded = true;
      }),
      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.loaded = false;
        this.ad?.load();
      }),
      this.ad.addAdEventListener(AdEventType.ERROR, () => {
        this.loaded = false;
        // Reintento suave: no saturar la red si no hay inventario.
        setTimeout(() => this.ad?.load(), 60 * 1000);
      }),
    ];
    this.ad.load();
  }

  /** Devuelve true si mostró un anuncio. `blocked` = el usuario está en un flujo crítico. */
  registerOpportunity(blocked: boolean) {
    this.opportunities += 1;
    const now = Date.now();
    const ready =
      !blocked &&
      this.loaded &&
      this.opportunities >= adPolicy.interstitialEveryNOpportunities &&
      now - this.startedAt >= adPolicy.interstitialGraceMs &&
      now - this.lastShownAt >= adPolicy.interstitialCooldownMs;
    if (!ready || !this.ad) return false;

    this.opportunities = 0;
    this.lastShownAt = now;
    this.ad.show().catch(() => {
      this.loaded = false;
    });
    return true;
  }

  stop() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.ad = null;
    this.loaded = false;
  }
}
