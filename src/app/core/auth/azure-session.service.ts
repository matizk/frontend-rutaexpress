import { Injectable, inject, signal } from '@angular/core';
import { AZURE_RUNTIME } from './azure.config';

@Injectable({ providedIn: 'root' })
export class AzureSessionService {
  private readonly runtime = inject(AZURE_RUNTIME);
  readonly isConfigured = signal(Boolean(this.runtime.client && this.runtime.config.enabled)).asReadonly();
  readonly isAuthenticated = signal(Boolean(this.runtime.client?.getActiveAccount())).asReadonly();
  readonly error = signal(this.runtime.error);
  readonly displayName = signal(this.runtime.client?.getActiveAccount()?.name ?? 'Operador');

  async signIn(): Promise<void> {
    const { client, config } = this.runtime;
    if (!client) { this.error.set('Faltan los datos reales de Azure en azure-config.json.'); return; }
    try {
      await client.loginRedirect({ scopes: [this.apiScope()], prompt: 'select_account',
        redirectStartPage: window.location.origin + '/operador',
        redirectUri: window.location.origin + config.redirectPath });
    } catch { this.error.set('No se pudo abrir el acceso institucional. Revisa Azure o vuelve a intentarlo.'); }
  }
  async accessToken(): Promise<string | null> {
    const { client } = this.runtime;
    const account = client?.getActiveAccount();
    if (!client || !account) return null;
    try {
      const result = await client.acquireTokenSilent({ account, scopes: [this.apiScope()] });
      this.error.set('');
      return result.accessToken;
    } catch {
      // No automatic redirects from an HTTP interceptor or infinite login loops.
      this.error.set('Tu sesión Azure necesita autorización. Abre Mi acceso en el menú y vuelve a autorizar tu cuenta de operador.');
      return null;
    }
  }
  async signOut(): Promise<void> {
    try {
      await this.runtime.client?.logoutRedirect({ account: this.runtime.client.getActiveAccount() });
    } catch { this.error.set('No se pudo cerrar la sesión institucional.'); }
  }
  private apiScope(): string { return 'api://' + this.runtime.config.apiClientId + '/' + this.runtime.config.scope; }
}
