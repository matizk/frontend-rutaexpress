import { Injectable, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { switchMap } from 'rxjs';
import { bffApiScope, entraConfig, isEntraConfigured } from './entra.config';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly account = signal<AccountInfo | null>(null);
  private readonly configurationError = signal('');

  readonly isAuthenticated = () => this.account() !== null;
  readonly displayName = () => this.account()?.name ?? this.account()?.username ?? 'Administrador';
  readonly isConfigured = isEntraConfigured;
  readonly error = this.configurationError.asReadonly();

  constructor(private readonly msal: MsalService) {
    this.msal.initialize()
      .pipe(switchMap(() => this.msal.handleRedirectObservable()))
      .subscribe({
        next: (result) => {
          if (result?.account) this.msal.instance.setActiveAccount(result.account);
          this.refreshAccount();
        },
        error: () => this.configurationError.set('No fue posible inicializar Microsoft Entra ID.'),
      });
  }

  signIn(): void {
    if (!this.isConfigured()) {
      this.configurationError.set('Faltan los identificadores de Microsoft Entra ID. Revisa la guía de configuración del repositorio.');
      return;
    }

    this.configurationError.set('');
    this.msal.loginRedirect({ scopes: [bffApiScope()] }).subscribe({
      error: () => this.configurationError.set('No fue posible iniciar sesión con Microsoft Entra ID.'),
    });
  }

  signOut(): void {
    this.msal.logoutRedirect({ postLogoutRedirectUri: entraConfig.redirectUri }).subscribe({
      error: () => this.configurationError.set('No fue posible cerrar la sesión de Microsoft Entra ID.'),
    });
  }

  private refreshAccount(): void {
    const account = this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    if (account) this.msal.instance.setActiveAccount(account);
    this.account.set(account);
  }
}
