# Declaraciones en Play Console (Contenido de la app)

Respuestas para **Play Console → Política → Contenido de la app**, según lo que hace esta versión
(gratuita, con banner de AdMob y sin Premium activo). Si activas Premium, revisa las notas marcadas.

## Política de privacidad
`https://sismoalert-ac8cf.web.app/privacidad`

## Anuncios
**¿Contiene anuncios? Sí** (banner de AdMob para usuarios gratuitos).
Si publicas sin configurar AdMob (sin `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`), la app no muestra anuncios: entonces responde **No**.

## Acceso a la app
Algunas funciones requieren iniciar sesión. Crea una cuenta de prueba para los revisores de Google
y escribe su correo y contraseña en **"Se requieren credenciales"**.

## Clasificación de contenido
Categoría: **Utilidades, productividad, comunicación u otras**. Responde **No** a violencia, sexo,
lenguaje, drogas, apuestas y compras de artículos digitales (mientras Premium esté apagado).
Interacción entre usuarios: **No** (los avisos van a contactos que el usuario agrega, no hay chat).
Comparte ubicación con otros usuarios: **Sí** (solo cuando el usuario envía un aviso de ayuda).

## Público objetivo
Recomendado: **18 años o más**. Así evitas los requisitos adicionales para apps dirigidas a menores
(la app no está pensada para niños).

## Apps de noticias / gobierno
Noticias: **No**. Gobierno: **No** (usa datos públicos del SGC, pero no es una app oficial).

## Apps de salud
Marca **Sí**: guarda una ficha de emergencia opcional (tipo de sangre, alergias, medicamentos).
Categoría sugerida: **"Seguridad y emergencias / Información médica de emergencia"**.
No es un dispositivo médico.

## Funciones financieras
**Ninguna.**

## Permisos sensibles
- **Ubicación (solo mientras se usa la app):** "Calcular la distancia de los sismos al usuario y
  compartir su ubicación con sus contactos cuando pide ayuda." No se usa ubicación en segundo plano.
- No pide SMS, teléfono ni contactos del celular: abre el editor de SMS y el marcador del sistema.

## Seguridad de los datos
| Tipo de dato | ¿Se recoge? | ¿Se comparte? | Opcional | Finalidad |
| --- | --- | --- | --- | --- |
| Nombre | Sí | No | No | Funcionalidad de la app, administración de la cuenta |
| Correo electrónico | Sí | No | No | Administración de la cuenta |
| Ubicación aproximada | Sí* | No | Sí | Funcionalidad de la app |
| Ubicación precisa | Sí* | No | Sí | Funcionalidad de la app |
| Información de salud | Sí | No | Sí | Funcionalidad de la app |
| Contactos (los que agrega el usuario) | Sí | No | Sí | Funcionalidad de la app |
| Otro contenido generado por el usuario (kit, plan, historial) | Sí | No | Sí | Funcionalidad de la app |
| ID del dispositivo u otros (token de notificaciones) | Sí | No | No | Funcionalidad de la app |
| ID de publicidad | Sí | Sí (AdMob) | No | Publicidad |

\* La ubicación precisa se procesa en el teléfono. Declárala igual, porque el usuario puede enviarla en un mensaje de ayuda.

Otras respuestas:
- ¿Los datos se cifran en tránsito? **Sí.**
- ¿El usuario puede pedir que se borren sus datos? **Sí**: en la app y en `https://sismoalert-ac8cf.web.app/eliminar-cuenta`.
- Proveedores (Firebase, Expo, AdMob) actúan como encargados del tratamiento.

**Si activas Premium:** añade "Historial de compras" (RevenueCat/Google Play) y marca que la
ubicación aproximada se guarda en el servidor y se comparte con Twilio (SMS a contactos).

## Eliminación de cuentas
URL: `https://sismoalert-ac8cf.web.app/eliminar-cuenta`. En la app: **Perfil → Eliminar mi cuenta**.
