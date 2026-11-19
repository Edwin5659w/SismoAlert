import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { bannerUnitId } from '../config/monetization';
import { gatherConsentAndInitialize, showPrivacyOptions } from '../lib/ads';
import { useEntitlement } from './EntitlementContext';

/**
 * Publicidad discreta: solo un banner pequeño, nunca anuncios de pantalla completa
 * (en una app de emergencias interrumpirían en el peor momento).
 */
type AdsContextValue = {
  /** Se puede mostrar el banner: usuario Free, consentimiento dado, SDK y bloque disponibles. */
  enabled: boolean;
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
};

const AdsContext = createContext<AdsContextValue | undefined>(undefined);

export function AdsProvider({ children }: { children: ReactNode }) {
  const { tier, adFree } = useEntitlement();
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const startedRef = useRef(false);

  // Premium nunca inicializa el SDK de anuncios (ni pide consentimiento).
  const wantsAds = tier === 'free' && !adFree && bannerUnitId() !== null;

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

  const value = useMemo<AdsContextValue>(
    () => ({ enabled, privacyOptionsRequired, openPrivacyOptions: showPrivacyOptions }),
    [enabled, privacyOptionsRequired],
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
