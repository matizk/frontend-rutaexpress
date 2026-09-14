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

## Seguridad

El flujo final será Microsoft Entra ID + MSAL en Angular. Mientras se configura el tenant académico, existe un acceso de demostración local únicamente para recorrer la interfaz. No otorga acceso al backend: el BFF sigue siendo el límite de seguridad y exige JWT válido con rol `Admin`.

## Estado

La rama `matizk` contiene la primera vertical del frontend: interfaz responsive, navegación, guard, formularios reactivos, cliente HTTP de envíos y proxy hacia el BFF.
