# frontend-rutaexpress

> Versión de integración EV2: `desarrollo`, mediante el [PR #1](https://github.com/matizk/frontend-rutaexpress/pull/1). `main` conserva EV1 hasta una release validada. Ver [Gitflow](CONTRIBUTING.md). El login institucional y AWS/RDS siguen pendientes de verificación real.

Frontend Angular de RutaExpress para DSY1107 – Desarrollo Cloud Native.

## Qué resuelve

- Inicio público y vista de trazabilidad.
- Consulta pública de tracking por código, sin exponer datos personales.
- Pantalla de acceso y ruta administrativa protegida por un guard de Angular.
- Panel para crear envíos y actualizar su estado.
- Panel de Catálogo para administrar tarifas y cupos disponibles.
- Integración exclusivamente por `/api` hacia el BFF; el navegador no debe llamar directamente a los microservicios de catálogo o envíos.

## Arquitectura

```text
Angular LOCAL -> AWS API Gateway -> BFF -> Catálogo / Envíos / Mensajería / Reportes
     |                                         |             |
     +-> Azure: identidad del operador         PostgreSQL    RabbitMQ
```

Durante desarrollo `proxy.conf.json` redirige `/api` a `http://localhost:8080`, donde debe ejecutarse el BFF. En AWS esa misma ruta será atendida por API Gateway.

## Ejecutar localmente

La opción recomendada es el stack Docker de la carpeta hermana ms-rutaexpress-shipments, según su PREPARACION_EQUIPO_EV2.md. No requiere Node instalado en Windows. Para desarrollo fuera de Docker se probó Node 24.19 y npm 11:

```powershell
npm ci
npm start
```

Abre `http://localhost:4200`.

## Validación

```powershell
npm run build
npm test -- --watch=false
```

La integración se valida con 15 pruebas automatizadas del frontend. El tracking
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
Solicita un **access token** mediante Authorization Code con PKCE y lo adjunta
automáticamente sólo a las llamadas `/api/*`; el navegador nunca se conecta
directamente a los microservicios.

La configuración está en `src/app/core/auth/cognito.config.ts`. El User Pool ID,
App Client ID y dominio son identificadores públicos, pero **no se crea ni se
guarda un client secret en Angular**. Los tokens se guardan en `sessionStorage`,
por lo que se eliminan al cerrar la pestaña. La guía completa está en
`docs/COGNITO_SETUP.md`.

El guard de Angular exige el grupo exacto `Admin` para la experiencia visual. El
BFF es el límite de seguridad final: valida firma, emisor, App Client,
`token_use=access`, vigencia y grupo `Admin`. Sin esos elementos rechaza la
operación aunque alguien manipule el frontend.

## Estado

La rama `main` contiene la versión funcional de la entrega: interfaz responsive,
autenticación con Cognito, guard administrativo, tracking público, formularios de
envíos, selector de servicios del Catálogo, reportes y proxy hacia el BFF.

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

Operación incluye un panel que consulta `/api/messaging/summary` y `/api/messaging/receipts` a través del BFF. Actualiza los resultados cada cinco segundos, permite buscar entre los últimos 100 registros y descargar un comprobante de texto por evento. Son resultados reales persistidos por los consumidores; las notificaciones son internas y no representan emails enviados. El stack de prueba se inicia desde `ms-rutaexpress-shipments/iniciar-ev2.ps1` e incluye la nueva carpeta hermana `ms-rutaexpress-messaging`.

## Operador y Azure (avance EV2 local)

`/operador` separa la revisión y aceptación de las solicitudes de su registro administrativo. Muestra el ticket de aceptación procesado por RabbitMQ y permite descargarlo; no confunde un evento CREADO con una confirmación. Incluye MSAL y configuración pública en `public/azure-config.json`, deshabilitada hasta obtener los datos reales del tenant. BFF, Envíos y Mensajería validan el JWT de operador y no le conceden Admin. Cognito administrativo sigue disponible para revisar el flujo, identificado como tal. Falta probar login Duoc y cloud reales. Pasos y límites en [AZURE_OPERADOR.md](docs/AZURE_OPERADOR.md).

## Dependencias y destino de API

Angular, CLI y build están fijados en 22.2.3, con package-lock.json regenerado y comprobado mediante npm ci. La auditoría del 15-10-2026 terminó con cero alertas conocidas en producción y desarrollo; las pruebas y el build de producción pasaron. Esto no certifica ausencia de vulnerabilidades en todo el sistema.

La imagen Nginx usa una plantilla con BFF_UPSTREAM, por defecto http://bff:8080. En el stack EV2 se configura mediante FRONTEND_API_UPSTREAM en .env.ev2 o con configurar-api.ps1. Admite un origen HTTPS y stage opcional, conserva /api y su query, usa SNI y valida certificados. El destino debe ser la API oficial del equipo, pues recibirá los bearer tokens. La configuración inválida se rechaza antes de iniciar Nginx.

Guías de ejecución, diagnóstico y demostración: PREPARACION_EQUIPO_EV2.md y DEMOSTRACION_Y_EVIDENCIAS_EV2.md en la carpeta hermana ms-rutaexpress-shipments. Descargar `desarrollo` en los seis repositorios para continuar la integración EV2; no clonar `main` esperando estas funciones. Consultar el PR enlazado para comprobar su fusión. El login Duoc y el despliegue cloud reales siguen pendientes.

## Colaboracion y Gitflow

Consultar [CONTRIBUTING.md](CONTRIBUTING.md). El PR comprueba pruebas/build Angular con Node 24 y auditoria de produccion; no despliega ni utiliza credenciales AWS/Azure. Una feature pasa a desarrollo por revision; main solo debe recibir una release/hotfix aprobada.
