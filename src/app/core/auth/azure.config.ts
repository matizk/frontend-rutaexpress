import { InjectionToken } from '@angular/core';
import type { IPublicClientApplication } from '@azure/msal-browser';

export interface AzureConfiguration {
  enabled: boolean; tenantId: string; clientId: string; apiClientId: string;
  scope: string; redirectPath: string;
}
export interface AzureRuntime {
  config: AzureConfiguration; client: IPublicClientApplication | null; error: string;
}
const empty: AzureConfiguration = {
  enabled: false, tenantId: '', clientId: '', apiClientId: '', scope: 'operator.access', redirectPath: '/auth/azure',
};
let runtime: AzureRuntime = { config: empty, client: null, error: '' };
export const AZURE_RUNTIME = new InjectionToken<AzureRuntime>('Azure runtime', { providedIn: 'root', factory: () => runtime });

export function validateAzureConfiguration(value: unknown): AzureConfiguration {
  const c = value as Partial<AzureConfiguration> | null;
  if (!c || typeof c.enabled !== 'boolean') throw new Error('Configuración Azure inválida.');
  if (!c.enabled) return { ...empty };
  const guid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if (![c.tenantId, c.clientId, c.apiClientId].every(v => typeof v === 'string' && guid.test(v))
      || typeof c.scope !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(c.scope)
      || c.redirectPath !== '/auth/azure') {
    throw new Error('Completa tenantId, clientId, apiClientId y scope en azure-config.json. El callback debe ser /auth/azure.');
  }
  return c as AzureConfiguration;
}

export async function initializeAzureRuntime(): Promise<void> {
  try {
    const response = await fetch('/azure-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar azure-config.json.');
    const config = validateAzureConfiguration(await response.json());
    runtime = { config, client: null, error: '' };
    if (!config.enabled) return;
    const { PublicClientApplication, BrowserCacheLocation } = await import('@azure/msal-browser');
    const client = new PublicClientApplication({
      auth: { clientId: config.clientId, authority: 'https://login.microsoftonline.com/' + config.tenantId,
        redirectUri: window.location.origin + config.redirectPath,
        postLogoutRedirectUri: window.location.origin + '/operador' },
      cache: { cacheLocation: BrowserCacheLocation.SessionStorage },
      system: { loggerOptions: { piiLoggingEnabled: false, loggerCallback: () => undefined } },
    });
    await client.initialize();
    // Do not let MSAL consume Cognito's separate OAuth callback.
    const cognitoCallback = window.location.pathname !== config.redirectPath
      && new URLSearchParams(window.location.search).has('code');
    const result = cognitoCallback ? null
      : await client.handleRedirectPromise({ navigateToLoginRequestUrl: false });
    if (result?.account) client.setActiveAccount(result.account);
    const accounts = client.getAllAccounts().filter(account => account.tenantId === config.tenantId);
    if (!client.getActiveAccount() && accounts.length === 1) client.setActiveAccount(accounts[0]);
    runtime = { config, client, error: '' };
    if (window.location.pathname === config.redirectPath) window.history.replaceState(null, '', '/operador');
  } catch {
    runtime = { config: empty, client: null,
      error: 'Azure no pudo inicializarse. Revisa la configuración, el callback y los permisos del tenant.' };
    // Avoid passing an Azure callback to Amplify even when the exchange fails.
    if (window.location.pathname === '/auth/azure') window.history.replaceState(null, '', '/operador');
  }
}
