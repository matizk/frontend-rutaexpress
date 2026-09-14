# frontend-rutaexpress

Frontend Angular de RutaExpress para DSY1107 – Desarrollo Cloud Native.

## Qué resuelve

- Inicio público y vista de trazabilidad.
- Pantalla de acceso y ruta administrativa protegida por un guard de Angular.
- Panel para crear envíos y actualizar su estado.
- Integración exclusivamente por `/api` hacia el BFF; el navegador no debe llamar directamente a los microservicios de catálogo o envíos.

## Arquitectura

```text
Angular -> AWS API Gateway -> BFF -> ms-rutaexpress-catalog / ms-rutaexpress-shipments -> Oracle
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

## Docker

La imagen compila Angular y publica los archivos estáticos con Nginx. También
incluye `GET /health`, útil para una comprobación simple en Docker o AWS.

```powershell
docker build -t rutaexpress-frontend:local .
docker run --rm -p 4200:80 rutaexpress-frontend:local
```

## Seguridad: Microsoft Entra ID

El frontend usa MSAL para una SPA y solicita un **access token** destinado al BFF. El token se adjunta automáticamente sólo a las llamadas `/api/*`; el navegador nunca se conecta directo a los microservicios.

La configuración está en `src/app/core/auth/entra.config.ts`. Los identificadores de aplicación y tenant son públicos en una SPA, pero no deben confundirse con secretos: **no se crea ni se guarda un client secret en Angular**. La guía completa está en `docs/ENTRA_ID_SETUP.md`.

El BFF es el límite de seguridad final: valida firma, emisor, audiencia y el rol `Admin`. Sin esos elementos, rechaza la operación aunque el frontend se haya renderizado correctamente.

## Estado

La rama `matizk` contiene la primera vertical del frontend: interfaz responsive, navegación, guard, formularios reactivos, cliente HTTP de envíos y proxy hacia el BFF.
