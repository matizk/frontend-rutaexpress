# RutaExpress — guía para continuar

## Estado

La versión final e integrada de la entrega se encuentra en `main` en los cinco
repositorios.

Repositorios:

- Frontend: `https://github.com/matizk/frontend-rutaexpress.git`
- BFF: `https://github.com/matizk/ms-rutaexpress-bff.git`
- Catálogo: `https://github.com/matizk/ms-rutaexpress-catalog.git`
- Envíos: `https://github.com/matizk/ms-rutaexpress-shipments.git`
- Reportes: `https://github.com/matizk/ms-rutaexpress-report.git`

La solución ya tiene Cognito con grupo `Admin`, BFF con validación JWT, Catálogo, Envíos, Reportes, descuento de cupos, tracking público por código, PostgreSQL por servicio en Docker, pruebas y documentación.

## Arquitectura y puertos

```text
Angular 4200 -> BFF 8080 -> Catálogo 8081 -> catalog_db (PostgreSQL)
                         -> Envíos 5000 -> shipments_db (PostgreSQL)
                         -> Reportes 8082 -> Envíos
Tracking público: Angular -> BFF -> Envíos
```

## Descargar

```powershell
mkdir rutaexpress
cd rutaexpress
git clone https://github.com/matizk/frontend-rutaexpress.git
git clone https://github.com/matizk/ms-rutaexpress-bff.git
git clone https://github.com/matizk/ms-rutaexpress-catalog.git
git clone https://github.com/matizk/ms-rutaexpress-shipments.git
git clone https://github.com/matizk/ms-rutaexpress-report.git
```

Cada carpeta es un repositorio independiente. Para cambios nuevos, crear una rama
propia desde `main`, hacer commit y push en esa rama y abrir una Pull Request hacia
`main`. No versionar trabajo incompleto directamente sobre la rama final.

## Ejecutar localmente

Requisitos: Git, Node.js LTS, JDK 21 y Docker Desktop.

1. En `ms-rutaexpress-shipments`, copiar `.env.example` a `.env`, completar las contraseñas locales y ejecutar:

```powershell
docker compose -f compose.local.yml up -d shipments-db
```

2. En Catálogo, con PostgreSQL saludable:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5432/catalog_db'
$env:SPRING_DATASOURCE_USERNAME = 'rutaexpress'
$env:SPRING_DATASOURCE_PASSWORD = '<CATALOG_DB_PASSWORD_LOCAL>'
.\mvnw.cmd spring-boot:run
```

3. En Envíos, usar las mismas variables y agregar:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5433/shipments_db'
$env:SPRING_DATASOURCE_USERNAME = 'rutaexpress'
$env:SPRING_DATASOURCE_PASSWORD = '<SHIPMENTS_DB_PASSWORD_LOCAL>'
```

```powershell
$env:CATALOGO_URL = 'http://localhost:8081'
.\mvnw.cmd spring-boot:run
```

4. En Reportes:

```powershell
$env:SHIPMENTS_URL = 'http://localhost:5000'
.\mvnw.cmd spring-boot:run
```

5. En BFF configurar Cognito y las URLs locales:

```powershell
$env:COGNITO_ISSUER_URI = 'https://cognito-idp.us-east-1.amazonaws.com/<USER_POOL_ID>'
$env:COGNITO_CLIENT_ID = '<APP_CLIENT_ID>'
$env:CATALOGO_URL = 'http://localhost:8081'
$env:SHIPMENTS_URL = 'http://localhost:5000'
$env:REPORT_URL = 'http://localhost:8082'
$env:CORS_ALLOWED_ORIGIN = 'http://localhost:4200'
.\mvnw.cmd spring-boot:run
```

6. En Frontend:

```powershell
npm install
npm start
```

Abrir `http://localhost:4200/`. Usar `localhost`, no `127.0.0.1`, por la configuración de Cognito y CORS.

## Demo

1. Iniciar sesión con Cognito usando un usuario del grupo exacto `Admin`.
2. En Catálogo crear o revisar un servicio con cupos.
3. En Operación seleccionar el servicio y crear un envío.
4. El sistema genera un código `RX-...` y descuenta un cupo.
5. En la portada consultar ese código sin iniciar sesión.
6. En Reportes mostrar los KPI y destinos.

7. En un volumen PostgreSQL nuevo, Compose crea automáticamente las tablas de Envíos y
   Usuarios. Al entrar al panel Admin, el frontend sincroniza el `cognito_sub` real,
   correo, nombre y rol; nunca guarda la contraseña.

El registro se realiza mediante `POST /api/users` con el access token de un usuario
`Admin` y los campos `cognitoSub`, `email`, `rut`, `nombre`, `apellido` y `rol`.

El tracking público solo entrega código, estado, origen, destino y última actualización. No entrega nombre ni correo.

También existe `compose.stack.yml` en el repositorio de Envíos para levantar
PostgreSQL, Catálogo, Envíos, Reportes, BFF y frontend juntos. Requiere que los cinco repositorios
sean carpetas hermanas y que el `.env` tenga las variables de PostgreSQL y Cognito.
En ese modo, Nginx sirve Angular en el puerto 4200 y reenvía `/api` al servicio `bff`.
Compose también espera los healthchecks de Actuator antes de iniciar los servicios dependientes.

## Despliegue AWS implementado

- La instancia EC2 ejecuta Frontend, BFF, Catálogo, Envíos, Reportes y dos bases
  PostgreSQL mediante Docker Compose.
- Catálogo y Envíos mantienen persistencia separada, aunque ambas bases se ejecutan
  en la misma instancia para optimizar recursos de la entrega.
- API Gateway publica la ruta `ANY /api/{proxy+}`, la integra con el BFF y aplica
  CORS y un JWT Authorizer.
- Cognito administra el User Pool, App Client, Managed Login, usuarios y grupo
  `Admin`.
- Angular está publicado desde EC2 y utiliza API Gateway/BFF para sus solicitudes
  de negocio.

Antes de cada demostración se debe comprobar que la instancia EC2 esté en estado
`Running`, que `docker compose ps` muestre todos los servicios saludables y que las
URL de callback, logout y CORS coincidan exactamente con el origen público vigente.

## Revisión antes de entregar

- Confirmar que la profesora tenga acceso como colaboradora a todos los repositorios.
- Probar login, Catálogo, creación y actualización de Envíos, tracking público y
  Reportes desde un computador distinto.
- Guardar capturas de EC2, Docker Compose, API Gateway, Cognito y la aplicación.
- Verificar que los cambios finales estén fusionados en `main`.

Nunca subir `.env`, contraseñas, tokens, client secrets ni códigos de verificación.

## Estado de imágenes Docker

Las cinco imágenes se construyeron correctamente en el equipo local con estos nombres:

```text
rutaexpress-frontend:local
rutaexpress-bff:local
rutaexpress-catalog:local
rutaexpress-shipments:local
rutaexpress-report:local
```

Para reconstruirlas desde la carpeta que contiene los cinco repositorios:

```powershell
docker build -t rutaexpress-frontend:local .\frontend-rutaexpress
docker build -t rutaexpress-bff:local .\ms-rutaexpress-bff
docker build -t rutaexpress-catalog:local .\ms-rutaexpress-catalog
docker build -t rutaexpress-shipments:local .\ms-rutaexpress-shipments
docker build -t rutaexpress-report:local .\ms-rutaexpress-report
```

Para esta entrega las imágenes se construyen y ejecutan mediante Docker Compose en
EC2. Publicarlas en ECR puede realizarse como mejora posterior, pero no es necesario
para reproducir el despliegue actual.

## Valores actuales de Cognito

Estos identificadores no son contraseñas ni secretos, pero deben coincidir entre el frontend, el BFF y la configuración de AWS:

```text
User Pool ID: us-east-1_omx1k5huI
App Client ID: 41v988atubk0lrcmto285tk77i
Issuer: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_omx1k5huI
Dominio Hosted UI: https://us-east-1omx1k5hui.auth.us-east-1.amazoncognito.com
Grupo requerido: Admin
Callback local: http://localhost:4200/
``` 

## Comprobaciones y problemas habituales

- Ejecutar `docker compose -f compose.stack.yml config --quiet` antes de levantar el stack. Si aparecen advertencias de Cognito, revisar que `.env` tenga `COGNITO_ISSUER_URI` y `COGNITO_CLIENT_ID`.
- Si un puerto está ocupado, no iniciar una segunda copia del servicio. Cerrar únicamente el proceso propio que lo esté usando y volver a ejecutar.
- Si el login vuelve a `localhost` con error, comprobar que la URL de retorno del App Client sea exactamente `http://localhost:4200/` y abrir la aplicación con `localhost`, no con `127.0.0.1`.
- Si el BFF devuelve `401`, revisar que el usuario pertenezca al grupo exacto `Admin`, que el token sea nuevo y que el `COGNITO_ISSUER_URI` corresponda al mismo User Pool.
- Si el tracking devuelve `404`, verificar que se esté usando el código generado al crear el envío; la consulta pública no requiere iniciar sesión.
- El primer arranque de PostgreSQL puede tardar. Esperar a que los contenedores estén saludables antes de iniciar Catálogo y Envíos.
- Si se usa `compose.stack.yml`, ejecutarlo desde `ms-rutaexpress-shipments`; las cinco carpetas deben estar al mismo nivel y no se deben cambiar los nombres de las carpetas.
