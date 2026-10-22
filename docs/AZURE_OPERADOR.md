# Operador EV2: acceso Microsoft y confirmación de solicitudes

## Estado real

Actualizado al 21-10-2026. Hay una pantalla separada en /operador, integración con MSAL Browser 5.25.1 y validación de tokens Azure en BFF, Envíos y Mensajería. La configuración pública real está habilitada e integrada en `desarrollo` por el [PR #7](https://github.com/matizk/frontend-rutaexpress/pull/7). El integrante ya probó login Duoc, logout visible, aceptación, descarga de ticket y tracking público del caso `RX-1792623980566`. Daniel confirmó el mismo evento en RDS/RabbitMQ. El administrador sigue usando Cognito; la docente permitió conservarlo y centra EV2 en el operador Azure.

El directorio de proyecto es `DanielProyecto`, single-tenant. La cuenta académica del integrante necesitó una invitación externa a ese directorio; después de aceptarla pudo completar el flujo. El error previo AADSTS50020 no demostraba que su cuenta estuviera borrada ni obligaba a activar una suscripción Azure propia. No relajar issuer/tenant/audience/scope ni cambiar a multitenant como atajo. Cualquier permiso o consentimiento adicional se coordina con el responsable del directorio.

| Parámetro público | Valor compartido |
| --- | --- |
| Tenant ID | `6289a099-2080-4d8e-84ef-8c98e42b2599` |
| SPA Client ID | `55e07a0c-c96a-4e1b-95d2-7c3b06117828` |
| API Client ID | `fc461744-8d40-4e06-b5f9-7530c9f19d2b` |
| Scope delegado | `api://fc461744-8d40-4e06-b5f9-7530c9f19d2b/operator.access` |
| Callback | `http://localhost:4200/auth/azure` |
| Gateway | `https://awnqdvxvd9.execute-api.us-east-1.amazonaws.com` |

El [PR #8](https://github.com/matizk/frontend-rutaexpress/pull/8) centraliza la interfaz en **Acceder → Soy operador · Cuenta Duoc** y ofrece el logout en **Mi acceso**. Sigue abierto; comprobar la rama antes de buscar esos botones. No modifica los parámetros de esta tabla ni concede permisos nuevos.

## Antes de configurar

Los tres UUID públicos ya están en la tabla y en `public/azure-config.json`. Los pasos siguientes describen cómo revisar o reproducir la configuración, no una tarea pendiente de crear otras aplicaciones. No enviar contraseñas, client secrets, códigos de acceso ni tokens al chat o a GitHub.

En los registros existentes de Microsoft Entra, con los permisos que permita el tenant:

1. El frontend es una **SPA** del tenant del proyecto, al que accede la cuenta académica autorizada. Mantener el callback exacto **http://localhost:4200/auth/azure**. Si se publica otro origen HTTPS con autorización, registrar también su callback exacto con /auth/azure. Mantener el retorno de logout alineado con la configuración de la aplicación.
2. En el registro de la API, usar tokens de acceso **v2** (api.requestedAccessTokenVersion: 2 en el manifiesto) y exponer el Application ID URI **api://UUID-API**.
3. Exponer un permiso delegado **operator.access** (o usar el nombre real acordado), concederlo al frontend y obtener consentimiento institucional si se solicita. Pedir a un administrador del tenant que lo autorice cuando la cuenta académica no tenga permisos; no intentar eludir ese control.
4. Mantener el acceso limitado al tenant del proyecto y sus políticas. El permiso de operador se comprueba en nuestra API por tenant, cliente autorizado y scope delegado, no por el texto del correo. No crear grupos no significa hacer pública la API.

La implementación exige esa API y versión de token: no sirve un ID token, un token de Microsoft Graph ni uno emitido para otra aplicación. No hay client secret en Angular porque es un cliente público.

## Configurar los archivos sin duplicar datos a mano

Para consumir el AWS actual, basta `npm ci` y `npm start` desde el frontend, con `http://localhost:4200`; no ejecutar el stack local ni reconfigurar IDs por defecto. Solo para un laboratorio local elegido expresamente, con las carpetas hermanas, los scripts de ms-rutaexpress-envios permiten alinear las variables:

~~~powershell
.\iniciar-ev2.ps1 -SoloConfigurar
.\configurar-azure.ps1 -TenantId 'UUID-TENANT-REAL' -FrontendClientId 'UUID-SPA-REAL' -ApiClientId 'UUID-API-REAL'
.\iniciar-ev2.ps1
~~~

Los textos UUID-...-REAL son marcadores explicativos: reemplazarlos por los identificadores reales del equipo antes de ejecutar. El parámetro -Scope nombre.real permite cambiar el nombre del permiso. -SoloValidar comprueba el formato y la presencia de archivos sin escribir ni verificar Azure.

El script conserva las contraseñas de .env.ev2 y configura:

| Archivo | Valores |
| --- | --- |
| Envíos: .env.ev2 (ignorado por Git) | AZURE_ENABLED=true, AZURE_TENANT_ID, AZURE_SPA_CLIENT_ID, AZURE_API_CLIENT_ID, AZURE_OPERATOR_SCOPE |
| Frontend: public/azure-config.json | enabled, tenantId, clientId de SPA, apiClientId, scope, redirectPath=/auth/azure |

Compose pasa la misma configuración a BFF, Envíos y Mensajería. Angular obtiene el archivo público al iniciar; al usar la imagen Docker hay que reconstruirla para incorporar el archivo modificado. Sus identificadores no son secretos, pero nunca se debe añadir allí una contraseña o client secret.

## Recorrido de demostración

1. El administrador entra con Cognito y registra desde **Operación** una solicitud con servicio disponible. Queda en CREADO. Esta es la interfaz actual de registro: no se presenta como un portal autónomo de cliente ni como registro público de usuarios.
2. En la versión de acceso centralizado del PR #8, usar **Acceder → Soy operador · Cuenta Duoc** y volver a /operador. Una sesión Azure no concede acceso a Catálogo, Reportes ni Rabbit Admin.
3. Seleccionar la solicitud pendiente, revisar sus datos y pulsar **Aceptar solicitud**. El backend solo permite pasar de CREADO a ACEPTADO. Bloquea la fila al cambiar de estado; dos operadores concurrentes no producen dos aceptaciones.
4. Envíos guarda el cambio y su outbox en la misma transacción. RabbitMQ procesa el evento y Mensajería persiste el ticket.
5. El panel consulta cada tres segundos hasta encontrar un ticket TICKET / shipment.status_changed / ACEPTADO. Un 404 significa que todavía no existe; se reintenta. No se ofrece un comprobante CREADO como confirmación.
6. Descargar la confirmación y consultar tracking público. El ticket acredita aceptación, no entrega. Los envíos históricos pueden no tener un evento de aceptación de EV2.

El código conserva una revisión local de la bandeja con Cognito Admin, identificada como tal; no acredita login Azure. El Gateway cloud separa authorizers por ruta según el traspaso de Daniel: utilizar Azure para la prueba de operador, sin asumir que Cognito autoriza las rutas del operador en ese Gateway.

## Seguridad y endpoints

- MSAL usa autorización con PKCE, sesión en sessionStorage y renovación silenciosa para el scope de nuestra API.
- El callback /auth/azure utiliza el redirect bridge de MSAL v5, del mismo origen, sin arrancar Angular/Amplify ni llamar a APIs; Nginx lo sirve con Cache-Control: no-store.
- BFF y los dos servicios validan firma RS256, issuer v2 del tenant, tid, aud de API, azp del frontend, oid, scp requerido y expiración. Un token Azure jamás obtiene Admin aunque incluya claims llamados roles o cognito:groups.
- El frontend envía Azure solo a /api/operator/**, nunca a URLs externas ni a APIs administrativas. Si expira una sesión Azure no cambia silenciosamente a la identidad Cognito más privilegiada.
- El BFF permite únicamente GET de listado/detalle/confirmación y POST de aceptación para operador. No concede creación de servicios, registro de usuarios ni eliminación de recursos.
- Las APIs antiguas de Envíos siguen siendo internas para conservar la comunicación entre servicios; no publicar directamente los puertos de microservicios, PostgreSQL ni Rabbit Management en internet. El acceso público debe pasar por el gateway/BFF y su control JWT.

| Método/ruta por BFF | Acción |
| --- | --- |
| GET /api/operator/shipments?status=CREADO | Listado por estado |
| GET /api/operator/shipments/{id} | Detalle |
| POST /api/operator/shipments/{id}/accept | Aceptar, sin elegir arbitrariamente otro estado |
| GET /api/operator/confirmations/{codigo} | Ticket de aceptación; 404 mientras no exista |

## Verificación y límites

Ejecutar npm test -- --watch=false, npm run build y mvnw.cmd test en BFF, Envíos y Mensajería. Hay pruebas con claves RSA/JWKS locales que comprueban firmas y rechazo de tenant/audience/cliente/scope incorrectos, expiración y falta de permisos. Las pruebas controladas no son evidencia de un login real en Microsoft.

El recorrido institucional ya se completó y se correlacionó con la confirmación interna de Daniel. Las consultas públicas repetidas devolvieron salud/tracking HTTP 200 y HTTP 401 para listado de operador y catálogo sin JWT. Reunir además la evidencia de authorizers, tokens inválidos y separación de permisos; no afirmar que esos cuatro GET prueban todas las combinaciones de autorización. El cierre de sesión visible no garantiza revocación inmediata de todo JWT emitido ni cierre de todas las sesiones Microsoft.

La respuesta escrita de la docente confirma que Angular se ejecuta localmente en EV2: no se exige desplegar el frontend ahora; se solicita en la siguiente entrega. Mantener el callback local y los servicios AWS existentes. Faltan auditoría de evidencias, informe/presentación y revisión Git, no crear otro entorno para repetir lo ya probado.

La alerta previa de Angular Router 22.1.6 y las alertas de herramientas de desarrollo se corrigieron actualizando el conjunto Angular/CLI/build a 22.2.3 y regenerando el lockfile sin force ni legacy-peer-deps. El 15-10-2026 npm audit y npm audit --omit=dev terminaron con cero alertas conocidas; las 15 pruebas Angular y la compilación de producción pasaron. La aplicación sigue siendo SPA estática, sin SSR. Repetir la auditoría al actualizar o preparar una entrega; cero alertas no equivale a seguridad universal.

Referencias oficiales: [inicialización MSAL](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization), [redirect bridge MSAL v5](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md), [validación de claims de la API](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation).
