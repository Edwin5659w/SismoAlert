import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  configurePurchases,
  getCurrentOffering,
  getCustomerInfo,
  hasActivePremium,
  isPurchasesAvailable,
  onCustomerInfoChange,
  purchase as purchaseWithStore,
  resetPurchasesUser,
  restore as restoreWithStore,
} from '../services/purchases';
import {
  FREE_ENTITLEMENT,
  ServerEntitlement,
  isEntitlementActive,
  requestEntitlementRefresh,
  subscribeEntitlement,
} from '../services/entitlements';
import { useAuth } from './AuthContext';

/**
 * Estado Free / Premium.
 *
 *  - `isPremium`  → lo confirma el SERVIDOR (Firestore). Úsalo para todo lo que importe.
 *  - `adFree`     → servidor O tienda. Solo decide si se muestran anuncios: si alguien
 *                   manipulara el teléfono, lo único que ganaría es no ver anuncios.
 *
 * Mientras carga o si hay error, la app se comporta como Free (nunca regala Premium
 * y nunca bloquea las funciones gratuitas).
 */
export type Tier = 'loading' | 'free' | 'premium';

type ActionResult = { ok: true } | { ok: false; cancelled?: boolean; message?: string };

type EntitlementContextValue = {
  tier: Tier;
  isPremium: boolean;
  adFree: boolean;
  entitlement: ServerEntitlement;
  storeAvailable: boolean;
  offering: PurchasesOffering | null;
  offeringError: string;
  loadOffering: () => Promise<void>;
  buy: (aPackage: PurchasesPackage) => Promise<ActionResult>;
  restore: () => Promise<ActionResult>;
  /** Hay compra en la tienda pero el servidor aún no la confirma. */
  activating: boolean;
};

const EntitlementContext = createContext<EntitlementContextValue | undefined>(undefined);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [entitlement, setEntitlement] = useState<ServerEntitlement>(FREE_ENTITLEMENT);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [storeInfo, setStoreInfo] = useState<CustomerInfo | null>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringError, setOfferingError] = useState('');
  const [now, setNow] = useState(Date.now());
  const refreshAttempted = useRef(false);

  // Fuente de verdad: entitlements/{uid}, escrito solo por Cloud Functions.
  useEffect(() => {
    setServerLoaded(false);
    setEntitlement(FREE_ENTITLEMENT);
    if (!uid) return;
    try {
      return subscribeEntitlement(
        uid,
        (next) => {
          setEntitlement(next);
          setServerLoaded(true);
        },
        () => {
          // Sin permiso o sin red: se comporta como Free.
          setEntitlement(FREE_ENTITLEMENT);
          setServerLoaded(true);
        },
      );
    } catch {
      setServerLoaded(true);
    }
  }, [uid]);

  // SDK de la tienda, ligado al uid de Firebase.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    setStoreReady(false);
    setStoreInfo(null);
    if (!uid) {
      resetPurchasesUser();
      return;
    }
    (async () => {
      const ok = await configurePurchases(uid);
      if (cancelled || !ok) return;
      setStoreInfo(await getCustomerInfo());
      setStoreReady(true);
      unsubscribe = onCustomerInfoChange(setStoreInfo);
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  // Revisa el vencimiento cada minuto, por si expira con la app abierta.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const storeActive = hasActivePremium(storeInfo);
  const isPremium = isEntitlementActive(entitlement, now);

  // Si la tienda dice "activo" y el servidor aún no, se le pide sincronizar una vez.
  useEffect(() => {
    if (storeActive && serverLoaded && !isPremium && !refreshAttempted.current) {
      refreshAttempted.current = true;
      requestEntitlementRefresh();
    }
    if (isPremium) refreshAttempted.current = false;
  }, [isPremium, serverLoaded, storeActive]);

  const loadOffering = useCallback(async () => {
    setOfferingError('');
    if (!isPurchasesAvailable()) {
      setOfferingError('Las suscripciones aún no están configuradas en esta versión de la app.');
      return;
    }
    try {
      const current = await getCurrentOffering();
      setOffering(current);
      if (!current || current.availablePackages.length === 0) {
        setOfferingError('No hay planes disponibles en este momento.');
      }
    } catch {
      setOfferingError('No pudimos cargar los planes. Revisa tu conexión.');
    }
  }, []);

  const buy = useCallback(async (aPackage: PurchasesPackage): Promise<ActionResult> => {
    const result = await purchaseWithStore(aPackage);
    if (result.status === 'cancelled') return { ok: false, cancelled: true };
    if (result.status === 'error') return { ok: false, message: result.message };
    setStoreInfo(result.customerInfo);
    // El webhook también actualiza Firestore; esto solo acelera la confirmación.
    requestEntitlementRefresh();
    return { ok: true };
  }, []);

  const restore = useCallback(async (): Promise<ActionResult> => {
    const result = await restoreWithStore();
    if (result.status !== 'purchased') {
      return { ok: false, message: result.status === 'error' ? result.message : undefined };
    }
    setStoreInfo(result.customerInfo);
    const premium = await requestEntitlementRefresh();
    if (!hasActivePremium(result.customerInfo) && !premium) {
      return { ok: false, message: 'No encontramos una suscripción activa en esta cuenta de la tienda.' };
    }
    return { ok: true };
  }, []);

  const tier: Tier = !serverLoaded ? 'loading' : isPremium ? 'premium' : 'free';

  const value = useMemo<EntitlementContextValue>(
    () => ({
      tier,
      isPremium,
      adFree: isPremium || storeActive,
      entitlement,
      storeAvailable: storeReady,
      offering,
      offeringError,
      loadOffering,
      buy,
      restore,
      activating: storeActive && !isPremium,
    }),
    [buy, entitlement, isPremium, loadOffering, offering, offeringError, restore, storeActive, storeReady, tier],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error('useEntitlement debe usarse dentro de EntitlementProvider');
  }
  return context;
}
