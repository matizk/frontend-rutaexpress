# Configuración de Microsoft Entra ID

## Objetivo

RutaExpress separa la aplicación de navegador de su API:

```text
Angular SPA -- access token --> API Gateway --> BFF --> microservicios
             Microsoft Entra ID              valida JWT + rol Admin
```

No se usa un client secret en Angular: una SPA es un cliente público y el secreto quedaría expuesto en el navegador.

## 1. Registrar la SPA

En Microsoft Entra admin center > **App registrations** > **New registration**:

- Nombre: `rutaexpress-frontend-spa`
- Cuentas: sólo cuentas de este directorio organizacional.
- Plataforma: **Single-page application (SPA)**.
- Redirect URI local: `http://localhost:4200/`.

Copiar el **Application (client) ID**. Es el valor `frontendClientId`.

## 2. Registrar la API del BFF

Crear otra aplicación:

- Nombre: `rutaexpress-bff-api`
- Cuentas: sólo cuentas de este directorio organizacional.
- En **Expose an API**, aceptar el Application ID URI sugerido: `api://<BFF_API_CLIENT_ID>`.
- Crear el scope delegado `access_as_user` y habilitar consentimiento de usuarios y administradores.
- En **App roles**, crear el rol para `Users/Groups`:
  - Display name: `Administrador RutaExpress`
  - Value: `Admin`
  - Description: `Permite administrar envíos y catálogo de RutaExpress`.

Copiar el **Application (client) ID**. Es el valor `bffApiClientId`.

## 3. Conectar SPA y API

En `rutaexpress-frontend-spa` > **API permissions** > **Add a permission** > **My APIs**:

1. Elegir `rutaexpress-bff-api`.
2. Seleccionar el permiso delegado `access_as_user`.
3. Conceder consentimiento si el tenant lo solicita.

Después, en la aplicación empresarial de `rutaexpress-bff-api`, asignar tu usuario al rol `Administrador RutaExpress`. Cerrar sesión y volver a iniciarla para recibir un token nuevo con `roles: ["Admin"]`.

## 4. Aplicar IDs al código y BFF

En `src/app/core/auth/entra.config.ts`, reemplazar los tres valores que hoy son `00000000-0000-0000-0000-000000000000`:

```ts
tenantId: '<Directory (tenant) ID>',
frontendClientId: '<Application ID de rutaexpress-frontend-spa>',
bffApiClientId: '<Application ID de rutaexpress-bff-api>',
```

En `ms-rutaexpress-bff`, configurar para ejecución local:

```text
JWT_ISSUER_URI=https://login.microsoftonline.com/<Directory (tenant) ID>/v2.0
JWT_AUDIENCE=<audience real del access token del BFF>
CORS_ALLOWED_ORIGIN=http://localhost:4200
```

La última verificación es inspeccionar el access token **sin publicarlo ni compartirlo**: debe tener el `aud` que valida el BFF y `roles` con `Admin`.

## Checklist de evidencia

- Captura de las dos app registrations y del redirect URI.
- Captura del scope `access_as_user` y rol `Admin`.
- Captura de API permissions con consentimiento.
- Captura del login real y de una llamada `/api/shipments` autorizada.
- Captura del rechazo al intentar operar sin token o sin rol.
