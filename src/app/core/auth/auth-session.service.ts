import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { isCognitoConfigured } from './cognito.config';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authenticated = signal(false);
  private readonly administrator = signal(false);
  private readonly name = signal('Administrador');
  private readonly configurationError = signal('');
  private initialization?: Promise<void>;

  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly isAdmin = this.administrator.asReadonly();
  readonly displayName = this.name.asReadonly();
  readonly isConfigured = isCognitoConfigured;
  readonly error = this.configurationError.asReadonly();

  constructor(private readonly router: Router) {
    if (this.isConfigured()) {
      Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'signedIn') {
          void this.refresh().then(() => this.router.navigateByUrl('/admin'));
        } else if (payload.event === 'signedOut') {
          this.clearSession();
        } else if (payload.event === 'signInWithRedirect_failure') {
          this.configurationError.set('Cognito no pudo completar el inicio de sesión.');
        }
      });
    }
    void this.initialize();
  }

  initialize(): Promise<void> {
    this.initialization ??= this.refresh();
    return this.initialization;
  }

  async signIn(): Promise<void> {
    if (!this.isConfigured()) {
      this.configurationError.set('Faltan los datos de AWS Cognito. Revisa docs/COGNITO_SETUP.md.');
      return;
    }

    this.configurationError.set('');
    try {
      await signInWithRedirect();
    } catch {
      this.configurationError.set('No fue posible abrir el acceso de AWS Cognito.');
    }
  }

  async signOut(): Promise<void> {
    this.configurationError.set('');
    try {
      await signOut();
      this.clearSession();
      await this.router.navigateByUrl('/');
    } catch {
      this.configurationError.set('No fue posible cerrar la sesión de AWS Cognito.');
    }
  }

  async accessToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    try {
      return (await fetchAuthSession()).tokens?.accessToken.toString() ?? null;
    } catch {
      this.clearSession();
      return null;
    }
  }

  showAdminRequired(): void {
    this.configurationError.set('Tu sesión es válida, pero necesitas pertenecer al grupo Admin de Cognito.');
  }

  private async refresh(): Promise<void> {
    if (!this.isConfigured()) {
      this.clearSession();
      return;
    }

    try {
      const [user, session] = await Promise.all([getCurrentUser(), fetchAuthSession()]);
      const accessPayload = session.tokens?.accessToken.payload;
      const idPayload = session.tokens?.idToken?.payload;
      const groups = accessPayload?.['cognito:groups'];
      this.authenticated.set(Boolean(session.tokens?.accessToken));
      this.administrator.set(Array.isArray(groups) && groups.includes('Admin'));
      this.name.set(this.textClaim(idPayload?.['name'])
        ?? this.textClaim(idPayload?.['email'])
        ?? user.signInDetails?.loginId
        ?? user.username);
      this.configurationError.set('');
    } catch {
      this.clearSession();
    }
  }

  private textClaim(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private clearSession(): void {
    this.authenticated.set(false);
    this.administrator.set(false);
    this.name.set('Administrador');
  }
}
