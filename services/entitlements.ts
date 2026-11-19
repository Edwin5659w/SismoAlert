import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseDb, getFirebaseFunctions } from '../lib/firebase';

/**
 * entitlements/{uid} lo escribe SOLO el servidor (webhook de RevenueCat o la
 * función refreshEntitlement). Las reglas de Firestore impiden que la app lo modifique,
 * así que cambiar este código en el teléfono no da acceso Premium.
 */
export type ServerEntitlement = {
  premium: boolean;
  expiresAt: number | null;
  productId?: string;
  store?: string;
  willRenew?: boolean;
};

export const FREE_ENTITLEMENT: ServerEntitlement = { premium: false, expiresAt: null };

function toMillis(value: unknown) {
  return value instanceof Timestamp ? value.toMillis() : null;
}

/** Premium solo si el servidor lo marcó y no ha vencido (o no tiene vencimiento). */
export function isEntitlementActive(entitlement: ServerEntitlement, now = Date.now()) {
  return entitlement.premium && (entitlement.expiresAt === null || entitlement.expiresAt > now);
}

export function subscribeEntitlement(
  uid: string,
  onChange: (entitlement: ServerEntitlement) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), 'entitlements', uid),
    (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        onChange(FREE_ENTITLEMENT);
        return;
      }
      onChange({
        premium: data.premium === true,
        expiresAt: toMillis(data.expiresAt),
        productId: typeof data.productId === 'string' ? data.productId : undefined,
        store: typeof data.store === 'string' ? data.store : undefined,
        willRenew: typeof data.willRenew === 'boolean' ? data.willRenew : undefined,
      });
    },
    onError,
  );
}

/**
 * Pide al servidor que consulte RevenueCat y actualice entitlements/{uid}.
 * Útil justo después de comprar, por si el webhook tarda unos segundos.
 */
export async function requestEntitlementRefresh() {
  try {
    const callable = httpsCallable<void, { premium: boolean }>(getFirebaseFunctions(), 'refreshEntitlement');
    const result = await callable();
    return result.data.premium;
  } catch (error) {
    console.warn('No se pudo sincronizar la suscripción con el servidor.', error);
    return null;
  }
}
