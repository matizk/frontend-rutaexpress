import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { isCognitoConfigured } from './cognito.config';

export type CognitoProfile = 'customer' | 'admin';

const requestedProfileKey = 'rutaexpress.cognito.requested-profile';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authenticated = signal(false);
  private readonly administrator = signal(false);
  private readonly name = signal('Administrador');
  private readonly configurationError = signal('');
  private readonly conflictingProfile = signal<CognitoProfile | null>(null);
  private initialization?: Promise<void>;

  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly isAdmin = this.administrator.asReadonly();
  readonly displayName = this.name.asReadonly();
  readonly error = this.configurationError.asReadonly();
  readonly profileConflict = this.conflictingProfile.asReadonly();

  constructor(private readonly router: Router) {
    if (this.isConfigured()) {
      Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'signedIn') {
          void this.refresh();
        } else if (payload.event === 'signedOut') {
          sessionStorage.removeItem(requestedProfileKey);
          this.clearSession();
        } else if (payload.event === 'signInWithRedirect_failure') {
          sessionStorage.removeItem(requestedProfileKey);
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

  isConfigured(): boolean {
    return isCognitoConfigured();
  }

  async signIn(profile: CognitoProfile): Promise<void> {
    await this.openCognito(profile, profile === 'customer' ? '/logout' : undefined);
  }

  async registerCustomer(): Promise<void> {
    await this.openCognito('customer', '/signup');
  }

  private async openCognito(profile: CognitoProfile, page?: '/logout' | '/signup'): Promise<void> {
    if (!this.isConfigured()) {
      this.configurationError.set('Faltan los datos de AWS Cognito. Revisa docs/COGNITO_SETUP.md.');
      return;
    }

    this.configurationError.set('');
    const previousProfile = this.requestedProfile();
    try {
      sessionStorage.setItem(requestedProfileKey, profile);
      await signInWithRedirect({
        options: {
          prompt: 'LOGIN',
          // Conserva el estado OAuth y el desafío PKCE que preparó Amplify.
          authSessionOpener: page ? async (authorizeUrl) => {
            const url = new URL(authorizeUrl);
            url.pathname = page;
            if (page === '/logout') url.searchParams.delete('identity_provider');
            window.location.assign(url.toString());
          } : undefined,
        },
      });
    } catch {
      if (previousProfile) {
        sessionStorage.setItem(requestedProfileKey, previousProfile);
      } else {
        sessionStorage.removeItem(requestedProfileKey);
      }
      this.configurationError.set(page === '/signup'
        ? 'No fue posible abrir el registro de cliente en Cognito.'
        : 'No fue posible abrir el acceso de AWS Cognito.');
    }
  }

  async signOut(): Promise<void> {
    this.configurationError.set('');
    try {
      await signOut();
      sessionStorage.removeItem(requestedProfileKey);
      this.clearSession();
      await this.router.navigateByUrl('/');
    } catch {
      this.configurationError.set('No fue posible cerrar la sesión de AWS Cognito.');
    }
  }

  async accessToken(): Promise<string | null> {
    if (!this.isConfigured() || this.profileConflict()) return null;
    try {
      const token = (await fetchAuthSession()).tokens?.accessToken;
      const requested = this.requestedProfile();
      if (!token || (requested && requested !== this.profileFromGroups(token.payload['cognito:groups']))) return null;
      return token.toString();
    } catch {
      this.clearSession();
      return null;
    }
  }

  async applicationUserProfile(): Promise<{
    cognitoSub: string; email: string; rut: string | null; nombre: string; apellido: string; rol: 'Admin'
  } | null> {
    try {
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      const cognitoSub = this.textClaim(payload?.['sub']);
      const email = this.textClaim(payload?.['email']);
      if (!cognitoSub || !email) return null;
      return {
        cognitoSub,
        email,
        rut: this.textClaim(payload?.['custom:rut']),
        nombre: this.textClaim(payload?.['given_name']) ?? email.split('@')[0],
        apellido: this.textClaim(payload?.['family_name']) ?? 'Sin apellido',
        rol: 'Admin',
      };
    } catch {
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
      const token = session.tokens?.accessToken;
      if (!token) {
        this.clearSession();
        return;
      }

      const requested = this.requestedProfile();
      const actual = this.profileFromGroups(token.payload['cognito:groups']);
      if (requested && requested !== actual) {
        if (this.profileConflict() === requested) return;
        this.clearSession();
        this.conflictingProfile.set(requested);
        void this.router.navigateByUrl(`/login#${requested}-title`);
        return;
      }

      const idPayload = session.tokens?.idToken?.payload;
      this.authenticated.set(true);
      this.administrator.set(actual === 'admin');
      this.conflictingProfile.set(null);
      this.name.set(this.textClaim(idPayload?.['name'])
        ?? this.textClaim(idPayload?.['email'])
        ?? user.signInDetails?.loginId
        ?? user.username);
      this.configurationError.set('');
      if (requested) {
        sessionStorage.removeItem(requestedProfileKey);
        void this.router.navigateByUrl(actual === 'admin' ? '/admin' : '/cliente');
      }
    } catch {
      this.clearSession();
    }
  }

  private requestedProfile(): CognitoProfile | null {
    const profile = sessionStorage.getItem(requestedProfileKey);
    return profile === 'admin' || profile === 'customer' ? profile : null;
  }

  private profileFromGroups(groups: unknown): CognitoProfile {
    return Array.isArray(groups) && groups.includes('Admin') ? 'admin' : 'customer';
  }

  private textClaim(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private clearSession(): void {
    this.authenticated.set(false);
    this.administrator.set(false);
    this.conflictingProfile.set(null);
    this.name.set('Administrador');
  }
}
