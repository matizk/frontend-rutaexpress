# frontend-rutaexpress

Frontend de RutaExpress para la Entrega 1 de DSY1107.

## Alcance inicial

- Angular con Home, Login y vista Admin.
- Autenticación con Microsoft Entra ID mediante MSAL Angular.
- Guards para las rutas protegidas.
- Un CRUD funcional para administración.

## Flujo de integración previsto

Angular obtiene el token con Entra ID y llama a AWS API Gateway usando `Authorization: Bearer <access_token>`.

## Estado

Repositorio inicial. No contiene aún código de aplicación ni configuraciones con secretos.
