/** Enlaces públicos de la app (los exige Google Play). Se publican con Firebase Hosting. */
export const WEBSITE_URL = 'https://sismoalert-ac8cf.web.app';
export const PRIVACY_URL = `${WEBSITE_URL}/privacidad`;
export const DELETE_ACCOUNT_URL = `${WEBSITE_URL}/eliminar-cuenta`;
export const TERMS_URL = `${WEBSITE_URL}/terminos`;
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';
