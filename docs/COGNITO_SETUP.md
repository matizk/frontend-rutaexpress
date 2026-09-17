# Configuración de AWS Cognito

El frontend utiliza el **Managed Login** de un Cognito User Pool. Es una SPA
pública: debe utilizar Authorization Code con PKCE y **no puede tener client secret**.

## Configuración AWS utilizada

- Región: `us-east-1`.
- User Pool configurado en Angular y BFF.
- App Client público configurado en Angular.
- Dominio administrado de Cognito configurado en Angular.
- Grupo exacto `Admin` con usuario de prueba asignado.

Los identificadores del User Pool, App Client y dominio son públicos y ya están
configurados en `src/app/core/auth/cognito.config.ts` y en el BFF. Nunca se debe
agregar un client secret, contraseña, token o código de verificación al repositorio.

## App Client

En Cognito configura:

- Tipo de aplicación: SPA o cliente público sin secreto.
- OAuth flow: Authorization code grant.
- PKCE utilizado por Amplify.
- Scopes: `openid` y `email`.
- Callback URL local: `http://localhost:4200/`.
- Sign-out URL local: `http://localhost:4200/`.

Agrega también las URLs HTTPS definitivas cuando se despliegue el frontend. Las
URLs deben coincidir exactamente, incluyendo protocolo, puerto y barra final.

## Configuración de Angular

La configuración ya está completada en
`src/app/core/auth/cognito.config.ts`. Si se cambia de User Pool, reemplaza solo
los identificadores públicos correspondientes; no agregues claves de acceso AWS,
contraseñas, tokens ni client secrets.

El access token se almacena en `sessionStorage`, se renueva mediante Amplify y se
adjunta solamente a rutas `/api/`. El guard exige visualmente el grupo `Admin`,
pero la autorización definitiva siempre la realiza el BFF.

## Prueba integral

1. Inicia PostgreSQL, catalog, shipments y BFF.
2. Ejecuta `npm start` y abre `http://localhost:4200/`.
3. Inicia sesión con un usuario del grupo `Admin`.
4. Comprueba que `/admin` lista y crea envíos.
5. En la portada consulta un código de tracking y confirma que no pide login.
6. Repite con un usuario sin el grupo y confirma que no entra al panel.
7. En DevTools > Network verifica `Authorization: Bearer ...` sólo en `/api/`.

No publiques capturas que muestren tokens completos.
