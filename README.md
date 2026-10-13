# SismoAlert

Aplicación móvil hecha con Expo y React Native para consultar sismos recientes. Usa Firebase Authentication para el inicio de sesión y Cloud Firestore para guardar los sismos y las preferencias de cada usuario.

## Funcionalidades

- Registro e inicio de sesión con correo y contraseña (Firebase Auth).
- Pantalla de inicio con la lista de sismos recientes, su magnitud, profundidad y severidad.
- Pantalla de ajustes con las preferencias del usuario guardadas en Firestore.

## Requisitos

- Node.js (versión LTS)
- La app Expo Go en el teléfono, o un emulador de Android / simulador de iOS
- Un proyecto de Firebase con Authentication (correo/contraseña) y Firestore activados

## Instalación

```bash
npm install
```

## Configuración de Firebase

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Completa cada variable `EXPO_PUBLIC_FIREBASE_*` con los datos de tu app web en la consola de Firebase (Configuración del proyecto → Tus apps).

El archivo `.env` está en `.gitignore`, así que tus claves no se suben al repositorio.

## Ejecutar la app

```bash
npm start            # servidor de desarrollo de Expo
npm run start:tunnel # si el teléfono no está en la misma red
npm run android      # abrir en Android
npm run ios          # abrir en iOS
npm run web          # abrir en el navegador
```

## Estructura del proyecto

| Carpeta       | Contenido                                      |
| ------------- | ---------------------------------------------- |
| `screens/`    | Pantallas (inicio, ajustes, login, registro)   |
| `components/` | Componentes reutilizables de la interfaz       |
| `navigation/` | Navegación por pestañas                        |
| `context/`    | Contexto de autenticación                      |
| `services/`   | Acceso a Firestore (sismos y ajustes)          |
| `lib/`        | Utilidades: Firebase, validaciones, tiempo     |
| `data/`       | Datos de ejemplo para poblar Firestore         |
