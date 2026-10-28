# frontend-rutaexpress

> Actualización del frontend EV2 del 28-10-2026: interfaz renovada, acceso por perfil y correcciones de carga y estados. `main` es la rama estable para descargar y demostrar; `desarrollo` es la integración y el trabajo personal continúa en `matizk`. Las publicaciones pasan por PR de integración y después por `release/*` → PR a `main`, conservando los commits. Ver [Gitflow](COLABORACION.md). Publicar el código no sustituye las evidencias ni la evaluación académica.

El 21-10-2026 se completó el caso `RX-1792623980566` con Azure Duoc, aceptación, ticket descargado y tracking público ACEPTADO. Daniel confirmó el mismo evento en RDS/RabbitMQ. Los [PR #7](https://github.com/matizk/frontend-rutaexpress/pull/7) y [PR #8](https://github.com/matizk/frontend-rutaexpress/pull/8) ya quedaron integrados en `desarrollo`: configuración AWS/Azure/Cognito, acceso centralizado y corrección de Vite. La validación del 22-10-2026 aprobó 26 pruebas, compilación y auditoría completa de dependencias. [Estado y pendientes del equipo](https://github.com/matizk/ms-rutaexpress-envios/blob/desarrollo/CONTINUAR_EV2_EQUIPO.md). La evidencia privada de AWS se atribuye al responsable que la obtuvo.

Frontend Angular de RutaExpress para DSY1107 – Desarrollo Cloud Native.

## Qué resuelve

- Inicio público y vista de trazabilidad.
- Consulta pública de tracking por código, sin exponer datos personales.
- Pantalla de acceso y ruta administrativa protegida por un guard de Angular.
- Acceso centralizado con perfiles separados: operador mediante Microsoft Entra ID y administrador mediante Cognito.
- Panel para crear envíos y actualizar su estado.
- Panel de Catálogo para administrar tarifas y cupos disponibles.
- Integración exclusivamente por `/api` hacia el BFF; el navegador no debe llamar directamente a los microservicios de catálogo o envíos.

## Arquitectura

```text
Angular LOCAL -> AWS API Gateway -> BFF -> Catálogo / Envíos / Mensajería / Reportes
     |                                         |             |
     +-> Azure: identidad del operador         PostgreSQL    RabbitMQ
```

La configuración compartida de `proxy.conf.json` redirige `/api` al API Gateway HTTPS del equipo. Angular sigue ejecutándose en `http://localhost:4200`; no debe apuntarse el navegador a la IP pública de EC2. Para un entorno completamente local, el proxy puede configurarse de forma explícita hacia el BFF local, sin cambiar los contratos `/api`.

## Acceso por perfil

El menú ofrece un único enlace **Acceder** hacia `/login`. En esa pantalla se elige:

- **Soy operador · Cuenta Duoc:** inicia Microsoft Entra ID para revisar solicitudes, aceptarlas y consultar sus tickets. La cuenta debe estar autorizada en el directorio del proyecto. No requiere iniciar antes una sesión Cognito.
- **Soy administrador · Cognito:** inicia el acceso administrativo existente para catálogo, envíos, reportes y actividad; el backend sigue exigiendo el grupo Admin.

Cuando hay una sesión abierta, el menú muestra su perfil e identidad y permite volver a **Mi acceso**. Si existen ambas sesiones, se identifican por separado y el enlace se llama **Mis accesos**. Cada perfil tiene su propio cierre de sesión en esa pantalla; salir de uno no cierra el otro. En Operador no se duplican botones de autenticación, y el seguimiento público permanece disponible sin sesión.

La pantalla centraliza la interfaz, no los permisos ni los tokens. No modifica tenant, scopes, callbacks, authorizers ni validaciones del backend.

## Ejecutar localmente

En otro computador instala Git y Node.js 24 LTS. Con la configuración AWS compartida, basta iniciar Angular localmente; no se necesita Docker ni levantar otra copia de los servicios cloud. Se probó Node 24.19 y npm 11. Para descargar una copia nueva:

```powershell
git clone --branch main https://github.com/matizk/frontend-rutaexpress.git
cd frontend-rutaexpress
npm.cmd ci
npm.cmd start
```

Abre exactamente `http://localhost:4200`. No uses otro puerto ni `127.0.0.1`, porque los callbacks de autenticación están registrados para ese origen. El backend del equipo en AWS debe estar encendido; ejecutar Angular no inicia AWS Academy, EC2 ni RDS.

Si ya tienes una copia sin cambios locales pendientes, actualízala así:

```powershell
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

Conserva primero cualquier trabajo local en tu rama personal. Si Git detecta cambios o divergencias, revísalos antes de continuar; no uses `reset --hard` ni un push forzado para actualizar. Cada integrante desarrolla en su rama y propone cambios hacia `desarrollo`.

Para pruebas completamente locales, el stack Docker de la carpeta hermana `ms-rutaexpress-envios` se documenta en su `PREPARACION_EQUIPO_EV2.md`. Ese modo es distinto del consumo de los servicios AWS existentes.

## Validación

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
npm.cmd audit
```

La integración se valida con pruebas automatizadas de selección de proveedor,
identificación y cierre independiente de sesiones, configuración y operación. El tracking
público consume `/api/shipments/track/{codigo}` y las operaciones administrativas
usan el access token sólo en rutas `/api/` protegidas. La actualización del 28-10-2026 incluye 53 pruebas: autenticación por perfil, tracking, aceptación, mensajes de error, formularios, reportes, actividad y selector del estado confirmado. Una prueba unitaria no equivale a un nuevo login institucional ni a una prueba completa en AWS; el caso real del 21-10-2026 se documenta por separado.

## Docker

La imagen compila Angular y publica los archivos estáticos con Nginx. También
incluye `GET /health`, útil para una comprobación simple en Docker o AWS.

```powershell
docker build -t rutaexpress-frontend:local .
docker run --rm -p 4200:80 rutaexpress-frontend:local
```

## Seguridad: AWS Cognito

El frontend usa la biblioteca oficial AWS Amplify con el Managed Login de Cognito.
Solicita un **access token** mediante Authorization Code con PKCE. El interceptor adjunta Cognito a las rutas administrativas `/api/*`; para `/api/operator/*` con sesión Azure activa usa exclusivamente el access token de la API de operador, sin fallback silencioso a Cognito. No envía tokens a URLs externas. El navegador nunca se conecta directamente a los microservicios.

La configuración está en `src/app/core/auth/cognito.config.ts`. El User Pool ID,
App Client ID y dominio son identificadores públicos, pero **no se crea ni se
guarda un client secret en Angular**. Los tokens se guardan en `sessionStorage`,
por lo que se eliminan al cerrar la pestaña. La guía completa está en
`docs/CONFIGURACION_COGNITO.md`.

El guard de Angular exige el grupo exacto `Admin` para la experiencia visual. El
BFF es el límite de seguridad final: valida firma, emisor, App Client,
`token_use=access`, vigencia y grupo `Admin`. Sin esos elementos rechaza la
operación aunque alguien manipule el frontend.

## Estado

La rama `main` contiene el frontend estable EV2. La actualización de octubre renueva las pantallas públicas y administrativas, muestra la navegación según el perfil y distingue datos vacíos de cargas fallidas. El selector administrativo refleja el estado confirmado por el backend y lo conserva si una actualización es rechazada. `desarrollo` reúne los cambios revisados del equipo y `matizk` es la rama personal de Matías. No se modifican los contratos de API, proveedores de identidad ni recursos AWS desde esta actualización visual.

## Despliegue AWS

En EV2 Angular puede ejecutarse localmente según la respuesta escrita de la docente; publicarlo es opcional y se solicitará en entrega 3 y/o ET. Las solicitudes usan el prefijo /api y pasan por el BFF o por la URL HTTPS de API Gateway/API Manager del equipo. El frontend no debe acceder directamente a los microservicios.

El inicio de sesión utiliza Cognito Managed Login con Authorization Code y PKCE. Las
URL de callback y logout deben coincidir exactamente con el origen desde el cual se
abre la aplicación. Esta configuración se concentra en
`src/app/core/auth/cognito.config.ts`; antes de compilar para otro entorno se deben
ajustar allí los orígenes y registrarlos también en el App Client de Cognito.

## Referencias

- [AWS: uso de PKCE con Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html)
- [AWS Amplify: administrar tokens y sessionStorage](https://docs.amplify.aws/angular/build-a-backend/auth/connect-your-frontend/manage-user-sessions/)

## Panel EV2 de actividad y comprobantes

La pantalla Envíos (`/admin`) incluye un panel que consulta `/api/messaging/summary` y `/api/messaging/receipts` a través del BFF. Actualiza los resultados cada cinco segundos, permite buscar entre los últimos 100 registros y descargar un comprobante de texto por evento. Son resultados reales persistidos por los consumidores; las notificaciones son internas y no representan emails enviados. Para el laboratorio completamente local, el stack de prueba se inicia desde `ms-rutaexpress-envios/iniciar-ev2.ps1` e incluye la carpeta hermana `ms-rutaexpress-mensajeria`.

## Operador y Azure: integración probada

La bandeja actual exige una sesión Azure antes de consultar solicitudes. Si solo hay Cognito Admin, orienta al acceso Duoc sin enviar una consulta de operador con ese perfil. Los avisos distinguen sesión inválida (401), permisos insuficientes (403), conexión y servicio no disponible (5xx). Una carga fallida no se presenta como una lista vacía ni como ausencia de cupos; los formularios esperan los datos necesarios antes de habilitar el envío. Estas correcciones de interfaz no modifican los authorizers ni el despliegue AWS.

`/operador` separa la revisión y aceptación de las solicitudes de su registro administrativo. Muestra el ticket de aceptación procesado por RabbitMQ y permite descargarlo; no confunde un evento CREADO con una confirmación. MSAL está habilitado y `public/azure-config.json` contiene los identificadores públicos reales integrados por PR #7. BFF, Envíos y Mensajería validan el JWT de operador y no le conceden Admin. Cognito permanece como acceso administrativo separado, permitido por la aclaración docente.

El integrante probó login/logout institucional, aceptó `RX-1792623980566` y descargó su ticket. El tracking público devuelve ACEPTADO; Daniel confirmó el evento `d88da0d8-4f06-42b0-9f6d-03c7916052c1` en outbox y recepciones AUDIT, NOTIFICATION y TICKET. Esta inspección interna se atribuye a Daniel, no a las pruebas unitarias. Pasos, configuración y límites en [AZURE_OPERADOR.md](docs/AZURE_OPERADOR.md). No publicar capturas con identidad sin revisarlas y sanitizarlas.

## Dependencias y destino de API

Corrección de seguridad del 22-10-2026: se fija Vite `8.3.5` mediante `overrides` porque Angular Build `22.2.3` solicita la versión vulnerable `8.3.0`. No se actualiza Angular a otra serie ni se cambian los proveedores de identidad. Se regenera el lockfile y se verifica con instalación limpia, tests, build y auditoría completa. Alcance, fuentes y mantenimiento del override en [SEGURIDAD_DEPENDENCIAS.md](docs/SEGURIDAD_DEPENDENCIAS.md).

El CI instala con `npm ci --no-audit` para evitar una consulta de auditoría duplicada durante la instalación y ejecuta después un paso **obligatorio** `npm audit`, ahora incluyendo producción y desarrollo. No se omiten severidades, no se ignoran fallos y se mantienen límites/reintentos de red acotados. Un timeout o error del registro sigue impidiendo aprobar el job.

Angular, CLI y build están fijados en 22.2.3, con package-lock.json regenerado y comprobado mediante npm ci. La auditoría del 15-10-2026 terminó con cero alertas conocidas en producción y desarrollo; las pruebas y el build de producción pasaron. Esto no certifica ausencia de vulnerabilidades en todo el sistema.

El 28-10-2026 se actualiza únicamente `fast-uri` de `3.1.8` a `3.1.9` en el lockfile, dentro del rango de su dependencia indirecta, para corregir los avisos publicados por su mantenedor. Se conserva el override de Vite y se repiten instalación limpia, pruebas, compilación y auditoría completa. El resultado vigente de cada publicación está en su CI; una auditoría anterior no garantiza el estado futuro del registro.

La imagen Nginx usa una plantilla con BFF_UPSTREAM, por defecto http://bff:8080. En el stack EV2 se configura mediante FRONTEND_API_UPSTREAM en .env.ev2 o con configurar-api.ps1. Admite un origen HTTPS y stage opcional, conserva /api y su query, usa SNI y valida certificados. El destino debe ser la API oficial del equipo, pues recibirá los bearer tokens. La configuración inválida se rechaza antes de iniciar Nginx.

Guías de ejecución, diagnóstico y demostración: PREPARACION_EQUIPO_EV2.md y DEMOSTRACION_Y_EVIDENCIAS_EV2.md en la carpeta hermana ms-rutaexpress-envios. Para demostrar el sistema con el backend AWS existente, descarga `main` de este frontend y sigue los pasos anteriores. Para modificar el proyecto, parte de la integración vigente y trabaja en tu rama personal. Los documentos fechados conservan la evidencia de ese momento; sus pendientes históricos no sustituyen el estado actual de PR, CI o servicios cloud. No hace falta reconstruir AWS para actualizar esta interfaz.

## Colaboracion y Gitflow

Consultar [COLABORACION.md](COLABORACION.md). El PR comprueba pruebas/build Angular con Node 24 y auditoría de producción y desarrollo; no despliega ni utiliza credenciales AWS/Azure. Los cambios pasan a `desarrollo` por revisión; `main` solo recibe una entrega o corrección aprobada mediante PR desde `release/*` o `hotfix/*`.
