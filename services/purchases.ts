import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { PREMIUM_ENTITLEMENT, revenueCatApiKey } from '../config/monetization';

/*
 * Envoltura de RevenueCat. El resto de la app NO importa 'react-native-purchases'
 * directamente: así se puede cambiar de proveedor sin tocar las pantallas.
 *
 * Importante: lo que diga el SDK en el teléfono solo se usa para la interfaz
 * (p. ej. ocultar anuncios al instante). La fuente de verdad es entitlements/{uid}
 * en Firestore, que solo escribe el servidor.
 */

export type PurchaseOutcome =
  | { status: 'purchased'; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

let configuredFor: string | null = null;

export function isPurchasesConfigured() {
  return configuredFor !== null;
}

export function isPurchasesAvailable() {
  return Boolean(revenueCatApiKey);
}

/** Configura el SDK ligado al uid de Firebase, para que la compra siga a la cuenta. */
export async function configurePurchases(uid: string) {
  if (!revenueCatApiKey) return false;
  try {
    if (configuredFor === null) {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN).catch(() => undefined);
      Purchases.configure({ apiKey: revenueCatApiKey, appUserID: uid });
      configuredFor = uid;
    } else if (configuredFor !== uid) {
      await Purchases.logIn(uid);
      configuredFor = uid;
    }
    return true;
  } catch (error) {
    console.warn('No se pudo configurar RevenueCat.', error);
    return false;
  }
}

export async function resetPurchasesUser() {
  if (configuredFor === null) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut falla si el usuario ya era anónimo; no importa.
  }
  configuredFor = null;
}

export function hasActivePremium(info: CustomerInfo | null | undefined) {
  return Boolean(info?.entitlements.active[PREMIUM_ENTITLEMENT]?.isActive);
}

export async function getCustomerInfo() {
  if (!isPurchasesConfigured()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function onCustomerInfoChange(listener: (info: CustomerInfo) => void) {
  if (!isPurchasesConfigured()) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesConfigured()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'Este dispositivo no permite compras. Revisa las restricciones de la tienda.';
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return 'Tu pago está pendiente de aprobación. Te avisaremos cuando se confirme.';
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return 'Ya tienes esta suscripción. Usa "Restaurar compras".';
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return 'La tienda no respondió. Inténtalo en unos minutos.';
    default:
      return 'No se pudo completar la compra. Inténtalo de nuevo.';
  }
}

function isCancelled(error: unknown) {
  const err = error as { code?: string; userCancelled?: boolean | null };
  return err?.userCancelled === true || err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export async function purchase(aPackage: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(aPackage);
    return { status: 'purchased', customerInfo };
  } catch (error) {
    if (isCancelled(error)) return { status: 'cancelled' };
    return { status: 'error', message: errorMessage(error) };
  }
}

export async function restore(): Promise<PurchaseOutcome> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { status: 'purchased', customerInfo };
  } catch (error) {
    return { status: 'error', message: errorMessage(error) };
  }
}

export type { PurchasesOffering, PurchasesPackage, CustomerInfo };
