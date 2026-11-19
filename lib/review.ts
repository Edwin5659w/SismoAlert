import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

/*
 * Ventana oficial de Google Play / App Store para calificar la app.
 * Se pide poco y en buenos momentos (p. ej. después de confirmar "Estoy bien"),
 * nunca durante una alerta. Google además limita cuántas veces se muestra.
 */

const KEY = 'sismoalert:review';
const MIN_LAUNCHES = 3;
const MIN_DAYS_SINCE_INSTALL = 2;
const DAYS_BETWEEN_PROMPTS = 120;
const DAY = 24 * 60 * 60 * 1000;

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sismoalert.app';

type ReviewState = { firstOpenAt: number; launches: number; lastPromptAt?: number };

async function load(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ReviewState;
  } catch {
    // sin datos guardados
  }
  return { firstOpenAt: Date.now(), launches: 0 };
}

async function save(state: ReviewState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // no es crítico
  }
}

/** Se llama una vez por cada apertura de la app. */
export async function recordAppLaunch() {
  const state = await load();
  await save({ ...state, launches: state.launches + 1 });
}

/** Pide la calificación solo si el usuario ya conoce la app y no se le pidió hace poco. */
export async function maybeAskForReview() {
  try {
    const state = await load();
    const now = Date.now();
    const ready =
      state.launches >= MIN_LAUNCHES &&
      now - state.firstOpenAt >= MIN_DAYS_SINCE_INSTALL * DAY &&
      (!state.lastPromptAt || now - state.lastPromptAt >= DAYS_BETWEEN_PROMPTS * DAY);
    if (!ready || !(await StoreReview.hasAction())) return false;

    await save({ ...state, lastPromptAt: now });
    // Pequeña pausa para que no aparezca encima de la animación de cierre.
    setTimeout(() => {
      StoreReview.requestReview().catch(() => undefined);
    }, 1200);
    return true;
  } catch {
    return false;
  }
}

/** Botón "Califica SismoAlert": abre la ficha de la tienda. */
export async function openStoreListing() {
  const url = StoreReview.storeUrl() ?? (Platform.OS === 'android' ? PLAY_STORE_URL : null);
  if (url) {
    await Linking.openURL(url);
    return;
  }
  if (await StoreReview.hasAction()) await StoreReview.requestReview();
}
