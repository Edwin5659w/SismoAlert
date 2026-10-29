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

**Cuenta**
- Registro, inicio de sesión, recuperación de contraseña y verificación de correo.
- Notificaciones push y preferencias de alertas (magnitud, radio, ubicación).

> La app no llama sola al 123: ningún teléfono lo permite sin que la persona toque la pantalla, y una llamada automática podría ser una falsa alarma. Por eso avisa primero a los contactos de confianza.

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
