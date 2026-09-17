# frontend-rutaexpress

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
Angular -> AWS API Gateway -> BFF -> Catálogo / Envíos -> PostgreSQL por servicio
```

Durante desarrollo `proxy.conf.json` redirige `/api` a `http://localhost:8080`, donde debe ejecutarse el BFF. En AWS esa misma ruta será atendida por API Gateway.

## Ejecutar localmente

Se requiere Node.js LTS y npm.

```powershell
npm install
npm start
```

Abre `http://localhost:4200`.

## Validación

```powershell
npm run build
npm test -- --watch=false
```

La integración se valida con 6 pruebas automatizadas del frontend. El tracking
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

La rama `matizk` contiene la vertical funcional de la entrega: interfaz responsive,
autenticación Cognito, guard administrativo, tracking público, formularios de
envíos, selector de servicios del Catálogo, reportes y proxy hacia el BFF.

## Referencias

- [AWS: uso de PKCE con Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html)
- [AWS Amplify: administrar tokens y sessionStorage](https://docs.amplify.aws/angular/build-a-backend/auth/connect-your-frontend/manage-user-sessions/)
