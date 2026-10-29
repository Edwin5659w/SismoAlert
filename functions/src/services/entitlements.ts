import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { PREMIUM_ENTITLEMENT } from '../config';
import { EntitlementRecord, RevenueCatSubscriber, entitlementFromSubscriber } from '../core/entitlement';

/** Consulta a RevenueCat el estado REAL del usuario (con la clave secreta del servidor). */
export async function fetchEntitlement(uid: string, secretKey: string): Promise<EntitlementRecord> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`RevenueCat respondió ${response.status}`);
  }
  return entitlementFromSubscriber((await response.json()) as RevenueCatSubscriber, PREMIUM_ENTITLEMENT);
}

export async function writeEntitlement(uid: string, record: EntitlementRecord, source: string) {
  await getFirestore()
    .doc(`entitlements/${uid}`)
    .set({
      premium: record.premium,
      expiresAt: record.expiresAt ? Timestamp.fromDate(record.expiresAt) : null,
      productId: record.productId,
      store: record.store,
      willRenew: record.willRenew,
      source,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function syncEntitlement(uid: string, secretKey: string, source: string) {
  const record = await fetchEntitlement(uid, secretKey);
  await writeEntitlement(uid, record, source);
  return record;
}

/** Verificación en el servidor antes de cualquier acción Premium (p. ej. llamar). */
export async function isPremium(uid: string, now = Date.now()) {
  const snapshot = await getFirestore().doc(`entitlements/${uid}`).get();
  const data = snapshot.data();
  if (!data?.premium) return false;
  const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : null;
  return expiresAt === null || expiresAt > now;
}
