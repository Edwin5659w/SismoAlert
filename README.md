# SismoAlert

Aplicación móvil hecha con Expo y React Native para consultar sismos en Colombia y actuar en una emergencia. Usa Firebase Authentication para las cuentas y Cloud Firestore para los sismos, las preferencias y los datos de seguridad de cada usuario.

## Funcionalidades

**Sismos**
- Sismos reales del Servicio Geológico Colombiano (respaldo: USGS), sincronizados en Firestore.
- Inicio con el estado de tu zona (tranquila, moderada o alta), el último sismo, la actividad de las últimas 24 horas y los sismos cerca de ti.
- Lista filtrable, mapa de epicentros con tu ubicación y radio de alerta, y detalle de cada sismo con la distancia a ti.

**Seguridad**
- Modo "¿Estás bien?": tras un sismo fuerte y cercano suena una alarma con cuenta regresiva. Si no respondes, se avisa a tus contactos de confianza que usan la app y queda el 123 listo para llamar.
- Botón SOS (mantener presionado): llamar al 123, SMS o WhatsApp a tus contactos con tu ubicación, compartir y avisar con notificación.
- Contactos de confianza, ficha de emergencia (tipo de sangre, alergias, medicamentos), kit de emergencia de 72 horas, plan familiar y simulacros.
- Guía de qué hacer antes, durante y después de un sismo, y líneas de emergencia de Colombia.

**Premium (suscripción)**
- Sin anuncios. Los usuarios gratuitos ven solo un banner pequeño en Inicio y en la lista de sismos (nunca anuncios de pantalla completa ni en pantallas de emergencia).
- Escalada automática desde el servidor: si no respondes a "¿Estás bien?" tras un sismo fuerte, Twilio llama y envía SMS a tus contactos de confianza, aunque la app esté cerrada.

**Cuenta**
- Registro, inicio de sesión, recuperación de contraseña y verificación de correo.
- Eliminación de la cuenta y de todos los datos desde la app (requisito de Google Play).
- Calificación en la tienda con la ventana oficial de Google, en buenos momentos y sin insistir.
- Notificaciones push y preferencias de alertas (magnitud, radio, ubicación).

> La app no llama sola al 123: ningún teléfono lo permite sin que la persona toque la pantalla, y una llamada automática podría ser una falsa alarma. Por eso avisa primero a los contactos de confianza.

## Publicar en Google Play

Todo lo necesario está en la carpeta `store/`:
- `store/PUBLICAR.md`: guía paso a paso (EAS, Play Console, prueba cerrada).
- `store/FICHA_PLAY_STORE.md`: nombre, descripciones y gráficos de la ficha.
- `store/DECLARACIONES_PLAY.md`: respuestas de "Contenido de la app" y "Seguridad de los datos".
- `hosting/`: política de privacidad, términos y eliminación de cuenta (Firebase Hosting).

## Requisitos

- Node.js (versión LTS)
- La app Expo Go en el teléfono, o una build de desarrollo (APK) con EAS
- Un proyecto de Firebase con Authentication (correo/contraseña) y Firestore activados

## Instalación

```bash
npm install
```

Si ya tenías una APK de desarrollo instalada, hay que generar una nueva porque se agregaron módulos nativos (`expo-location` y `expo-sms`):

```bash
npx eas-cli@latest build --profile development --platform android
```

## Configuración de Firebase

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Completa cada variable `EXPO_PUBLIC_FIREBASE_*` con los datos de tu app web en la consola de Firebase (Configuración del proyecto → Tus apps).

3. Publica las reglas de seguridad de `firestore.rules` (Firebase Console → Firestore → Reglas → Publicar, o `npx firebase-tools deploy --only firestore:rules`). **Cada vez que cambie ese archivo hay que publicarlo de nuevo.**

El archivo `.env` está en `.gitignore`, así que tus claves no se suben al repositorio.

## Ejecutar la app

```bash
npm start            # servidor de desarrollo de Expo
npm run start:tunnel # si el teléfono no está en la misma red
npm run android      # abrir en Android
npm run ios          # abrir en iOS
```

## Monetización y escalada Premium

La primera versión sale **sin Premium**: está oculto hasta poner `EXPO_PUBLIC_PREMIUM_ENABLED=true`. Sin configurar AdMob tampoco se muestran anuncios. Para activarlo:

1. **Development build:** AdMob y RevenueCat no funcionan en Expo Go. Genera una APK con `npx eas-cli@latest build --profile development --platform android`.
2. **AdMob:** crea la app en AdMob y reemplaza los IDs de prueba de `app.json` (`androidAppId`, `iosAppId`). Pon los bloques en `.env` (`EXPO_PUBLIC_ADMOB_*`). En desarrollo siempre se usan anuncios de prueba.
3. **RevenueCat:** crea el entitlement `premium`, una oferta con planes mensual y anual, y pon las claves **públicas** en `.env` (`EXPO_PUBLIC_REVENUECAT_*`).
4. **Cloud Functions** (requiere el plan Blaze de Firebase):
   ```bash
   cd functions && npm install && npm test && cd ..
   npx firebase-tools functions:secrets:set REVENUECAT_SECRET_KEY
   npx firebase-tools functions:secrets:set REVENUECAT_WEBHOOK_AUTH
   npx firebase-tools functions:secrets:set TWILIO_ACCOUNT_SID
   npx firebase-tools functions:secrets:set TWILIO_AUTH_TOKEN
   cp functions/.env.example functions/.env   # número de Twilio y modo simulado
   npx firebase-tools deploy --only functions,firestore:rules
   ```
5. En RevenueCat → Integrations → Webhooks, usa la URL de `revenuecatWebhook` y como *Authorization header* el mismo valor de `REVENUECAT_WEBHOOK_AUTH`.
6. Deja `TWILIO_DRY_RUN=true` hasta probar: así no se hacen llamadas reales.

**Seguridad del modelo:** el estado Premium lo escribe solo el servidor en `entitlements/{uid}` (las reglas impiden que la app lo cambie) y la escalada vuelve a verificarlo antes de llamar. Twilio **nunca** llama al 123: llama a los contactos de confianza, que deciden si pedir ayuda.

## Datos en Firestore

| Ruta | Contenido |
| --- | --- |
| `users/{uid}` | Perfil, preferencias de alertas y token push |
| `users/{uid}/contacts/{id}` | Contactos de confianza |
| `users/{uid}/private/medical` | Ficha de emergencia |
| `users/{uid}/private/preparedness` | Kit de emergencia, plan familiar y último simulacro |
| `users/{uid}/private/safety` | Ajustes del modo "¿Estás bien?" |
| `users/{uid}/checkins/{id}` | Historial de respuestas después de un sismo |
| `earthquakes/{id}` | Sismos sincronizados desde SGC/USGS |
| `publicProfiles/{correo}` | Token push para que los contactos vinculados reciban avisos |
| `entitlements/{uid}` | Estado de la suscripción (solo lo escribe el servidor) |
| `presence/{uid}` | Consentimiento y ubicación aproximada (≈1 km) para la escalada Premium |
| `users/{uid}/serverCheckins/{id}` | Preguntas "¿Estás bien?" creadas por el servidor |
| `escalations`, `serverEvents`, `escalationQuota` | Uso interno del servidor (auditoría y límites) |

Cada usuario solo puede leer y escribir sus propios datos.

## Estructura del proyecto

| Carpeta       | Contenido |
| ------------- | --------- |
| `screens/`    | Pantallas: inicio, sismos, mapa, seguridad, perfil y secundarias |
| `components/` | Componentes de la interfaz (`home/`, `safety/`, `auth/`) |
| `navigation/` | Navegación por pestañas |
| `context/`    | Autenticación y seguridad (modo "¿Estás bien?", SOS) |
| `hooks/`      | Sismos, sincronización y ubicación |
| `services/`   | Acceso a Firestore y fuentes de sismos |
| `lib/`        | Utilidades: Firebase, notificaciones, distancias, emergencias |
| `data/`       | Kit de emergencia, consejos y datos de ejemplo |
| `config/`     | Claves públicas de Firebase y configuración de monetización |
| `functions/`  | Cloud Functions: webhook de RevenueCat, vigilancia de sismos y escalada con Twilio |
