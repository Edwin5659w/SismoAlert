# Cómo publicar SismoAlert en Google Play

Guía paso a paso para la primera versión (gratuita). Tiempo estimado: 1 día de trabajo +
**14 días de prueba cerrada** si tu cuenta de desarrollador es personal y nueva.

## 0. Antes de empezar
- [x] Datos de contacto en `hosting/*.html` (Edwin Molina · edwinmolina154@gmail.com).
- [x] Correo de soporte en `.env`: `EXPO_PUBLIC_SUPPORT_EMAIL=edwinmolina154@gmail.com`.
- [ ] Publica las reglas y las páginas web (gratis, sin plan Blaze):
  ```bash
  npx firebase-tools login
  npx firebase-tools deploy --only firestore:rules,hosting
  ```
  Comprueba que abren: `https://sismoalert-ac8cf.web.app/privacidad` y `/eliminar-cuenta`.

## 1. Cuenta de Expo y proyecto EAS
`app.json` tiene `owner: "sececo"` y su `projectId`. Quien compile necesita acceso a esa cuenta de
Expo. Si vas a publicar tú con tu cuenta:
```bash
npx eas-cli@latest login
npx eas-cli@latest init   # crea un projectId nuevo; acepta reemplazar owner/projectId
```

## 2. Variables de entorno en EAS
El archivo `.env` **no** se sube a los servidores de compilación. Súbelo a EAS una vez:
```bash
npx eas-cli@latest env:push --environment production --path .env
npx eas-cli@latest env:push --environment preview --path .env
```

## 3. (Opcional) Anuncios
Sin esto la app sale sin anuncios. Para activarlos:
1. Crea la app en AdMob y un bloque de **banner**.
2. Cambia `androidAppId` en `app.json` (plugin `react-native-google-mobile-ads`) por tu ID real.
3. Agrega `EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-...` a tus variables de EAS.
4. En AdMob, configura el mensaje de consentimiento (Privacidad y mensajes → GDPR).

## 4. Probar una APK
```bash
npx eas-cli@latest build --profile preview --platform android
```
Instálala y revisa: registro, inicio de sesión, ubicación, simulacro, SOS, contactos, ficha,
"Eliminar mi cuenta".

## 5. Compilar para la tienda
```bash
npx eas-cli@latest build --profile production --platform android
```
Genera un `.aab`. El `versionCode` sube solo en cada compilación.

## 6. Play Console
1. Crea la cuenta de desarrollador (pago único de 25 USD) y verifica tu identidad.
2. **Crear app** → nombre "SismoAlert: sismos Colombia", idioma español (Latinoamérica), App, Gratis.
3. Llena **Contenido de la app** con `store/DECLARACIONES_PLAY.md`.
4. Llena la **ficha** con `store/FICHA_PLAY_STORE.md` y sube los gráficos de `store/`.
5. **Prueba cerrada:** crea una pista, sube el `.aab` (o usa `npx eas-cli@latest submit --profile production`),
   agrega al menos **12 testers** (compañeros, familia) y que se mantengan **14 días seguidos**.
   Requisito para cuentas personales creadas después del 13 de noviembre de 2023.
6. Después de los 14 días: **Panel → Solicitar acceso a producción** y envía la versión.

## 7. Activar Premium más adelante
Cuando tengas RevenueCat, Twilio y el plan Blaze (ver README → "Monetización y escalada Premium"):
1. Crea la suscripción en Play Console (Monetizar → Suscripciones) y conéctala a RevenueCat.
2. Despliega las Cloud Functions.
3. En los perfiles de EAS cambia `EXPO_PUBLIC_PREMIUM_ENABLED` a `"true"` y agrega las claves de RevenueCat.
4. Actualiza la sección "Seguridad de los datos" (ver notas en `DECLARACIONES_PLAY.md`).
