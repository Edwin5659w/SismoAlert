import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { InterstitialManager, gatherConsentAndInitialize, loadAdsModule, showPrivacyOptions } from '../lib/ads';
import { useEntitlement } from './EntitlementContext';
import { useSafety } from './SafetyContext';

type AdsContextValue = {
  /** Se pueden mostrar anuncios: usuario Free, consentimiento dado y SDK disponible. */
  enabled: boolean;
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
  /** Avisar de una oportunidad natural para un anuncio de pantalla completa. */
  registerInterstitialOpportunity: () => void;
};

const AdsContext = createContext<AdsContextValue | undefined>(undefined);

export function AdsProvider({ children }: { children: ReactNode }) {
  const { tier, adFree } = useEntitlement();
  const { checkIn } = useSafety();
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const managerRef = useRef<InterstitialManager | null>(null);
  const startedRef = useRef(false);

  // Premium nunca inicializa el SDK de anuncios (ni pide consentimiento).
  const wantsAds = tier === 'free' && !adFree;

  useEffect(() => {
    if (!wantsAds || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    gatherConsentAndInitialize()
      .then((result) => {
        if (cancelled) return;
        setCanRequestAds(result.canRequestAds);
        setPrivacyOptionsRequired(result.privacyOptionsRequired);
      })
      .catch((error) => console.warn('No se pudieron iniciar los anuncios.', error));
    return () => {
      cancelled = true;
    };
  }, [wantsAds]);

  const enabled = wantsAds && canRequestAds;

  useEffect(() => {
    const ads = loadAdsModule();
    if (!enabled || !ads) {
      managerRef.current?.stop();
      managerRef.current = null;
      return;
    }
    const manager = new InterstitialManager(ads);
    manager.start();
    managerRef.current = manager;
    return () => manager.stop();
  }, [enabled]);

  // Nunca interrumpir una alerta, un SOS o un simulacro.
  const blockedRef = useRef(false);
  blockedRef.current = checkIn.phase !== 'idle';

  const registerInterstitialOpportunity = useCallback(() => {
    managerRef.current?.registerOpportunity(blockedRef.current);
  }, []);

  const value = useMemo<AdsContextValue>(
    () => ({
      enabled,
      privacyOptionsRequired,
      openPrivacyOptions: showPrivacyOptions,
      registerInterstitialOpportunity,
    }),
    [enabled, privacyOptionsRequired, registerInterstitialOpportunity],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds debe usarse dentro de AdsProvider');
  }
  return context;
}
