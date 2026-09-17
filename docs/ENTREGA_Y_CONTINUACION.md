# RutaExpress — guía para continuar

## Estado

La rama de trabajo es `matizk`; `main` no se ha modificado.

Repositorios:

- Frontend: `https://github.com/matizk/frontend-rutaexpress.git`
- BFF: `https://github.com/matizk/ms-rutaexpress-bff.git`
- Catálogo: `https://github.com/matizk/ms-rutaexpress-catalog.git`
- Envíos: `https://github.com/matizk/ms-rutaexpress-shipments.git`
- Reportes: `https://github.com/matizk/ms-rutaexpress-report.git`

La solución ya tiene Cognito con grupo `Admin`, BFF con validación JWT, Catálogo, Envíos, Reportes, descuento de cupos, tracking público por código, Oracle en Docker, pruebas y documentación.

## Arquitectura y puertos

```text
Angular 4200 -> BFF 8080 -> Catálogo 8081 -> Oracle
                         -> Envíos 5000 -> Oracle
                         -> Reportes 8082 -> Envíos
Tracking público: Angular -> BFF -> Envíos
```

## Descargar

```powershell
mkdir rutaexpress
cd rutaexpress
git clone -b matizk https://github.com/matizk/frontend-rutaexpress.git
git clone -b matizk https://github.com/matizk/ms-rutaexpress-bff.git
git clone -b matizk https://github.com/matizk/ms-rutaexpress-catalog.git
git clone -b matizk https://github.com/matizk/ms-rutaexpress-shipments.git
git clone -b matizk https://github.com/matizk/ms-rutaexpress-report.git
```

Cada carpeta es un repositorio independiente. Trabajar siempre en `matizk`, hacer commit y push a `matizk`, y crear la Pull Request hacia `main` solo al final.

## Ejecutar localmente

Requisitos: Git, Node.js LTS, JDK 21 y Docker Desktop.

1. En `ms-rutaexpress-shipments`, copiar `.env.example` a `.env`, completar las contraseñas locales y ejecutar:

```powershell
docker compose -f compose.local.yml up -d oracle
```

2. En Catálogo, con Oracle saludable:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:oracle:thin:@//localhost:1521/FREEPDB1'
$env:SPRING_DATASOURCE_USERNAME = 'RUTAEXPRESS'
$env:SPRING_DATASOURCE_PASSWORD = '<APP_USER_PASSWORD_LOCAL>'
.\mvnw.cmd spring-boot:run
```

3. En Envíos, usar las mismas variables y agregar:

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

El tracking público solo entrega código, estado, origen, destino y última actualización. No entrega nombre ni correo.

También existe `compose.stack.yml` en el repositorio de Envíos para levantar
Oracle, Catálogo, Envíos, Reportes, BFF y frontend juntos. Requiere que los cinco repositorios
sean carpetas hermanas y que el `.env` tenga las variables de Oracle y Cognito.
En ese modo, Nginx sirve Angular en el puerto 4200 y reenvía `/api` al servicio `bff`.
Compose también espera los healthchecks de Actuator antes de iniciar los servicios dependientes.

## Pendiente para terminar AWS

- Definir con la profesora si se usará RDS PostgreSQL u Oracle; localmente se usa Oracle.
- Crear la base cloud, IAM, grupos de seguridad y variables de entorno.
- Publicar las imágenes Docker en ECR o desplegar JAR en EC2/Elastic Beanstalk.
- Desplegar Catálogo, Envíos, Reportes y BFF con comunicación interna.
- Configurar API Gateway hacia el BFF.
- Configurar dominio HTTPS, CORS y callbacks HTTPS de Cognito.
- Probar login Admin, usuario sin Admin, Catálogo, descuento de cupo, tracking y Reportes en AWS.
- Tomar capturas sin mostrar tokens, contraseñas ni códigos de correo.

## Reparto sugerido

- Encargado Cognito: confirmar User Pool, App Client, dominio, grupo `Admin` y usuarios de prueba.
- Encargado AWS: RDS, IAM, ECR, EC2/Beanstalk, API Gateway, red y variables.
- Encargado integración: URLs cloud, CORS, pruebas, capturas y Pull Request a `main`.

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

El siguiente paso cloud es etiquetar estas imágenes con el URI de ECR y hacer `docker push` usando credenciales IAM del encargado AWS.

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
- El primer arranque de Oracle puede tardar. Esperar a que el contenedor esté saludable antes de iniciar Catálogo y Envíos.
- Si se usa `compose.stack.yml`, ejecutarlo desde `ms-rutaexpress-shipments`; las cinco carpetas deben estar al mismo nivel y no se deben cambiar los nombres de las carpetas.
