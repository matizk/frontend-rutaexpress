# Configuración de AWS Cognito

El frontend utiliza el **Managed Login** de un Cognito User Pool. Es una SPA
pública: debe utilizar Authorization Code con PKCE y **no puede tener client secret**.

## Datos que debe entregar el responsable AWS

- Región, por ejemplo `us-east-1`.
- User Pool ID, por ejemplo `us-east-1_AbCd1234`.
- App Client ID público.
- Dominio de Cognito sin `https://`, por ejemplo
  `rutaexpress.auth.us-east-1.amazoncognito.com`.
- Confirmación de que existe el grupo exacto `Admin` y un usuario asignado.

## App Client

En Cognito configura:

- Tipo de aplicación: SPA o cliente público sin secreto.
- OAuth flow: Authorization code grant.
- PKCE utilizado por Amplify.
- Scopes: `openid`, `email` y `profile`.
- Callback URL local: `http://localhost:4200/`.
- Sign-out URL local: `http://localhost:4200/`.

Agrega también las URLs HTTPS definitivas cuando se despliegue el frontend. Las
URLs deben coincidir exactamente, incluyendo protocolo, puerto y barra final.

## Completar Angular

Edita `src/app/core/auth/cognito.config.ts` y sustituye los tres valores
`REPLACE_ME`. Estos identificadores son públicos; no agregues claves de acceso
AWS, contraseñas, tokens ni client secrets.

El access token se almacena en `sessionStorage`, se renueva mediante Amplify y se
adjunta solamente a rutas `/api/`. El guard exige visualmente el grupo `Admin`,
pero la autorización definitiva siempre la realiza el BFF.

## Prueba integral

1. Inicia Oracle, catalog, shipments y BFF.
2. Ejecuta `npm start` y abre `http://localhost:4200/`.
3. Inicia sesión con un usuario del grupo `Admin`.
4. Comprueba que `/admin` lista y crea envíos.
5. Repite con un usuario sin el grupo y confirma que no entra al panel.
6. En DevTools > Network verifica `Authorization: Bearer ...` sólo en `/api/`.

No publiques capturas que muestren tokens completos.
