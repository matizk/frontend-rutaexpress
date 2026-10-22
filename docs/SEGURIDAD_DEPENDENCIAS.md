# Seguridad de dependencias del frontend

Actualizado: 22 de octubre de 2026. Este registro explica la corrección de dependencias; no declara terminada EV2 ni garantiza ausencia universal de vulnerabilidades.

## Hallazgo y corrección

Angular Build `22.2.3` depende exactamente de Vite `8.3.0`. La consulta al endpoint oficial de advisories de npm identificó avisos de seguridad para esa versión de Vite, incluidos problemas del servidor de desarrollo y uno de severidad alta relacionado con comandos de editor en Windows. No se desestima una alerta por afectar herramientas de desarrollo.

Se fija Vite `8.3.5` mediante un `override` en el `package.json` raíz. Es un parche de la misma serie 8.3, posterior a los arreglos publicados en 8.3.3, compatible con el rango de Node 24 usado por el proyecto. El lockfile conserva Angular `22.2.3` y los demás paquetes directos; los cambios adicionales corresponden al árbol requerido por el parche de Vite.

No se usa `npm audit fix --force`, no se cambian registros a espejos de terceros ni se desactiva TLS, la comprobación de integridad o la auditoría. Los avisos resumidos por `npm ci` y la cantidad de advisories no son necesariamente la misma métrica; se comprueba el árbol completo después de corregirlo.

## Instalación y validación reproducibles

```powershell
npm ci --no-audit
npm ls vite
npm test -- --watch=false
npm run build
npm audit
```

`--no-audit` se aplica únicamente a la instalación para evitar repetir una consulta implícita de seguridad. El último comando es obligatorio y **no omite dependencias de desarrollo ni severidades**. Si informa vulnerabilidades o no logra consultar al registro, la validación falla. Las cifras de auditoría son resultados fechados del registro consultado, no una garantía para ejecuciones futuras.

## CI y fallos de red

El workflow conserva la validación Gitflow, Node 24, `npm ci`, pruebas y compilación. Ejecuta la auditoría completa como paso separado obligatorio, sin `continue-on-error`, sin `|| true` y sin bajar el umbral de severidad. Las solicitudes usan timeout de 30 segundos, dos reintentos y esperas acotadas; un fallo persistente mantiene el job fallido.

Los intentos anteriores del PR #8 habían aprobado tests/build pero fallaban al consultar el registro npm con timeout o `Service Unavailable`. Una consulta parcial que responde no basta para dar por auditado todo el proyecto. Se consultó el árbol completo en lotes solo para diagnosticar y localizar avisos; la aprobación final debe proceder también de la auditoría oficial completa y del CI, no de sustituirla por una muestra.

## Mantenimiento

Mantener el override mientras Angular Build solicite una versión afectada. Al actualizar Angular, revisar su dependencia de Vite y los advisories vigentes antes de quitarlo. Repetir instalación limpia, pruebas, build y auditoría; no retirar el parche solo para satisfacer una versión transitoria del builder.

La corrección no modifica código de negocio, tenant Azure, registros SPA/API, scope, callbacks, Cognito, API Gateway, AWS ni RDS. `main` sigue fuera de esta integración: los cambios se trabajan en `matizk` y se revisan mediante el PR #8 hacia `desarrollo`.

## Fuentes primarias

- [Aviso de severidad alta y versiones corregidas](https://github.com/advisories/GHSA-587h-7wmj-h5pm).
- [Aviso del servidor de desarrollo y versiones corregidas](https://github.com/advisories/GHSA-9jrq-w75r-8gcw).
- [Publicación oficial de Vite 8.3.5](https://github.com/vitejs/vite/releases/tag/v8.3.5).
- [npm: overrides](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).
- [npm: auditoría y endpoints oficiales](https://docs.npmjs.com/cli/v11/commands/npm-audit/).
- [npm: instalación reproducible con ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).
