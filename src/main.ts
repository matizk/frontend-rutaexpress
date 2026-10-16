import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { configureCognito } from './app/core/auth/cognito.config';
import { initializeAzureRuntime } from './app/core/auth/azure.config';

if (window.location.pathname === '/auth/azure') {
  // MSAL v5 bridge: no Angular router, Amplify or API requests on the OAuth response page.
  void import('@azure/msal-browser/redirect-bridge')
    .then(bridge => bridge.broadcastResponseToMainFrame())
    .catch(() => {
      document.body.textContent = 'No se pudo completar el acceso Microsoft. Vuelve a /operador e inicia sesión de nuevo.';
      window.history.replaceState(null, '', '/auth/azure');
    });
} else {
  void initializeAzureRuntime().then(() => {
    configureCognito();
    return bootstrapApplication(App, appConfig);
  }).catch((err) => console.error(err));
}
