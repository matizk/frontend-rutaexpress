# Operador EV2: acceso Microsoft y confirmación de solicitudes

## Estado real

Hay una pantalla separada en /operador, integración con MSAL Browser 5.25.1 y validación de tokens Azure en BFF, Envíos y Mensajería. Azure está deshabilitado por defecto: no se inventaron identificadores, no se modificó el tenant y no se probó una cuenta Duoc real. El administrador anterior sigue usando Cognito.

La configuración y el consentimiento del tenant académico todavía deben completarse con quien tenga los accesos. Esta guía no pide comprar Entra Premium ni crear grupos/usuarios nuevos.

## Antes de configurar

Obtener del equipo tres UUID públicos: tenant, aplicación SPA frontend y aplicación API backend. No enviar contraseñas, client secrets, códigos de acceso ni tokens al chat o a GitHub.

En los registros existentes de Microsoft Entra, con los permisos que permita el tenant:

1. El frontend es una **SPA** del tenant institucional. Registrar el callback exacto **http://localhost:4200/auth/azure**. Si se publica otro origen HTTPS, registrar también su callback exacto con /auth/azure. Registrar /operador del origen como retorno tras logout si el tenant lo requiere.
2. En el registro de la API, usar tokens de acceso **v2** (api.requestedAccessTokenVersion: 2 en el manifiesto) y exponer el Application ID URI **api://UUID-API**.
3. Exponer un permiso delegado **operator.access** (o usar el nombre real acordado), concederlo al frontend y obtener consentimiento institucional si se solicita. Pedir a un administrador del tenant que lo autorice cuando la cuenta académica no tenga permisos; no intentar eludir ese control.
4. Mantener el acceso limitado al tenant del proyecto y sus políticas. El permiso de operador se comprueba en nuestra API por tenant, cliente autorizado y scope delegado, no por el texto del correo. No crear grupos no significa hacer pública la API.

La implementación exige esa API y versión de token: no sirve un ID token, un token de Microsoft Graph ni uno emitido para otra aplicación. No hay client secret en Angular porque es un cliente público.

## Configurar los archivos sin duplicar datos a mano

Con las carpetas hermanas del stack, ejecutar desde ms-rutaexpress-envios:

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
2. Abrir /operador e ingresar con cuenta Duoc mediante Microsoft. Una sesión Azure no concede acceso a Catálogo, Reportes ni Rabbit Admin.
3. Seleccionar la solicitud pendiente, revisar sus datos y pulsar **Aceptar solicitud**. El backend solo permite pasar de CREADO a ACEPTADO. Bloquea la fila al cambiar de estado; dos operadores concurrentes no producen dos aceptaciones.
4. Envíos guarda el cambio y su outbox en la misma transacción. RabbitMQ procesa el evento y Mensajería persiste el ticket.
5. El panel consulta cada tres segundos hasta encontrar un ticket TICKET / shipment.status_changed / ACEPTADO. Un 404 significa que todavía no existe; se reintenta. No se ofrece un comprobante CREADO como confirmación.
6. Descargar la confirmación y consultar tracking público. El ticket acredita aceptación, no entrega. Los envíos históricos pueden no tener un evento de aceptación de EV2.

Con una sesión Cognito Admin válida también se puede revisar la bandeja. La pantalla lo identifica como **revisión administrativa Cognito**: sirve para probar funcionalidad local, no para acreditar el login Azure.

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

Falta verificar con el equipo: login institucional, consentimiento del scope, configuración JWT del API Manager y recorrido con EC2/RDS reales. La respuesta escrita de la docente aportada el 15-10-2026 confirma que Angular se ejecuta localmente en EV2: no se exige desplegar el frontend ahora. Su publicación es opcional y se solicitará en entrega 3 y/o ET. Mantener el callback local y comprobar que Angular consume los servicios remotos reales.

La alerta previa de Angular Router 22.1.6 y las alertas de herramientas de desarrollo se corrigieron actualizando el conjunto Angular/CLI/build a 22.2.3 y regenerando el lockfile sin force ni legacy-peer-deps. El 15-10-2026 npm audit y npm audit --omit=dev terminaron con cero alertas conocidas; las 15 pruebas Angular y la compilación de producción pasaron. La aplicación sigue siendo SPA estática, sin SSR. Repetir la auditoría al actualizar o preparar una entrega; cero alertas no equivale a seguridad universal.

Referencias oficiales: [inicialización MSAL](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization), [redirect bridge MSAL v5](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md), [validación de claims de la API](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation).
