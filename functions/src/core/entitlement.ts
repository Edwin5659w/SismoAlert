/**
 * Traduce la respuesta de la API REST de RevenueCat (GET /v1/subscribers/{id})
 * al documento entitlements/{uid}. Siempre se consulta la API en lugar de confiar
 * en el contenido del webhook: así el orden de los eventos no importa y nadie
 * puede falsificar un evento para activar Premium.
 */
export type RevenueCatSubscriber = {
  subscriber?: {
    entitlements?: Record<
      string,
      { expires_date?: string | null; product_identifier?: string; purchase_date?: string }
    >;
    subscriptions?: Record<
      string,
      {
        store?: string;
        expires_date?: string | null;
        unsubscribe_detected_at?: string | null;
        billing_issues_detected_at?: string | null;
      }
    >;
  };
};

export type EntitlementRecord = {
  premium: boolean;
  expiresAt: Date | null;
  productId: string | null;
  store: string | null;
  willRenew: boolean;
};

export const FREE_RECORD: EntitlementRecord = {
  premium: false,
  expiresAt: null,
  productId: null,
  store: null,
  willRenew: false,
};

export function entitlementFromSubscriber(
  body: RevenueCatSubscriber,
  entitlementId: string,
  now = new Date(),
): EntitlementRecord {
  const entitlement = body.subscriber?.entitlements?.[entitlementId];
  if (!entitlement) return FREE_RECORD;

  const expiresAt = entitlement.expires_date ? new Date(entitlement.expires_date) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return FREE_RECORD;

  const premium = expiresAt === null || expiresAt.getTime() > now.getTime();
  const productId = entitlement.product_identifier ?? null;
  const subscription = productId ? body.subscriber?.subscriptions?.[productId] : undefined;

  return {
    premium,
    expiresAt,
    productId,
    store: subscription?.store ?? null,
    willRenew: premium && !subscription?.unsubscribe_detected_at,
  };
}

/** Los IDs anónimos de RevenueCat no corresponden a ningún usuario de Firebase. */
export function isFirebaseUid(appUserId: unknown): appUserId is string {
  return (
    typeof appUserId === 'string' &&
    !appUserId.startsWith('$RCAnonymousID') &&
    /^[A-Za-z0-9]{10,128}$/.test(appUserId)
  );
}

/** Comparación en tiempo constante para el secreto del webhook. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
