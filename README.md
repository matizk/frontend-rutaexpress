# frontend-rutaexpress

> Versión de integración EV2: `desarrollo`. La configuración pública de API Gateway, Azure y Cognito se integró mediante el [PR #7](https://github.com/matizk/frontend-rutaexpress/pull/7). `main` conserva EV1 hasta una entrega validada. Ver [Gitflow](COLABORACION.md). La configuración publicada y las pruebas automatizadas no acreditan por sí solas el acceso de cada cuenta institucional ni los resultados internos de AWS/RDS.

Actualización documental del 21-10-2026, preparada en `matizk`: se completó el caso `RX-1792623980566` con Azure Duoc, aceptación, ticket descargado y tracking público ACEPTADO. Daniel confirmó el mismo evento en RDS/RabbitMQ. El [PR #8](https://github.com/matizk/frontend-rutaexpress/pull/8), que contiene el acceso centralizado descrito abajo, sigue abierto hacia `desarrollo`; no asumir que ya está integrado. [Estado y pendientes del equipo](https://github.com/matizk/ms-rutaexpress-envios/blob/matizk/CONTINUAR_EV2_EQUIPO.md).

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

Con la configuración AWS compartida, basta iniciar Angular localmente; no se necesita levantar otra copia de los servicios cloud. Se probó Node 24.19 y npm 11:

```powershell
npm ci
npm start
```

Abre `http://localhost:4200`.

Para pruebas completamente locales, el stack Docker de la carpeta hermana `ms-rutaexpress-envios` se documenta en su `PREPARACION_EQUIPO_EV2.md`. Ese modo es distinto del consumo de los servicios AWS existentes.

## Validación

```powershell
npm run build
npm test -- --watch=false
```

La integración se valida con pruebas automatizadas de selección de proveedor,
identificación y cierre independiente de sesiones, configuración y operación. El tracking
público consume `/api/shipments/track/{codigo}` y las operaciones administrativas
usan el access token sólo en rutas `/api/` protegidas.

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

La rama `main` conserva la entrega anterior (EV1): interfaz responsive, Cognito, guard administrativo, tracking, formularios, Catálogo y Reportes. No es todavía la entrega final EV2. `desarrollo` contiene la integración del equipo; `matizk` contiene el acceso centralizado del PR #8 y esta corrección documental, pendientes de revisión e integración. Consultar GitHub antes de actualizar una copia propia; no sobrescribir cambios ajenos.

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

Operación incluye un panel que consulta `/api/messaging/summary` y `/api/messaging/receipts` a través del BFF. Actualiza los resultados cada cinco segundos, permite buscar entre los últimos 100 registros y descargar un comprobante de texto por evento. Son resultados reales persistidos por los consumidores; las notificaciones son internas y no representan emails enviados. El stack de prueba se inicia desde `ms-rutaexpress-envios/iniciar-ev2.ps1` e incluye la nueva carpeta hermana `ms-rutaexpress-mensajeria`.

## Operador y Azure: integración probada

`/operador` separa la revisión y aceptación de las solicitudes de su registro administrativo. Muestra el ticket de aceptación procesado por RabbitMQ y permite descargarlo; no confunde un evento CREADO con una confirmación. MSAL está habilitado y `public/azure-config.json` contiene los identificadores públicos reales integrados por PR #7. BFF, Envíos y Mensajería validan el JWT de operador y no le conceden Admin. Cognito permanece como acceso administrativo separado, permitido por la aclaración docente.

El integrante probó login/logout institucional, aceptó `RX-1792623980566` y descargó su ticket. El tracking público devuelve ACEPTADO; Daniel confirmó el evento `d88da0d8-4f06-42b0-9f6d-03c7916052c1` en outbox y recepciones AUDIT, NOTIFICATION y TICKET. Esta inspección interna se atribuye a Daniel, no a las pruebas unitarias. Pasos, configuración y límites en [AZURE_OPERADOR.md](docs/AZURE_OPERADOR.md). No publicar capturas con identidad sin revisarlas y sanitizarlas.

## Dependencias y destino de API

Angular, CLI y build están fijados en 22.2.3, con package-lock.json regenerado y comprobado mediante npm ci. La auditoría del 15-10-2026 terminó con cero alertas conocidas en producción y desarrollo; las pruebas y el build de producción pasaron. Esto no certifica ausencia de vulnerabilidades en todo el sistema.

La imagen Nginx usa una plantilla con BFF_UPSTREAM, por defecto http://bff:8080. En el stack EV2 se configura mediante FRONTEND_API_UPSTREAM en .env.ev2 o con configurar-api.ps1. Admite un origen HTTPS y stage opcional, conserva /api y su query, usa SNI y valida certificados. El destino debe ser la API oficial del equipo, pues recibirá los bearer tokens. La configuración inválida se rechaza antes de iniciar Nginx.

Guías de ejecución, diagnóstico y demostración: PREPARACION_EQUIPO_EV2.md y DEMOSTRACION_Y_EVIDENCIAS_EV2.md en la carpeta hermana ms-rutaexpress-envios. Descargar `desarrollo` en los seis repositorios para continuar la integración EV2; no clonar `main` esperando estas funciones. El acceso centralizado del PR #8 y la corrección documental de esta pasada se revisan desde `matizk` hasta su integración. Faltan la auditoría completa de evidencias de pauta, informe/presentación y cierre Git aprobado, no repetir el login ya comprobado ni reconstruir AWS.

## Colaboracion y Gitflow

Consultar [COLABORACION.md](COLABORACION.md). El PR comprueba pruebas/build Angular con Node 24 y auditoria de produccion; no despliega ni utiliza credenciales AWS/Azure. Una feature pasa a desarrollo por revision; main solo debe recibir una entrega/corrección aprobada.
