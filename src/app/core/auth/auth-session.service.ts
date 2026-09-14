import { Injectable, signal } from '@angular/core';

const LOCAL_DEMO_SESSION = 'rutaexpress.local-demo-session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authenticated = signal(sessionStorage.getItem(LOCAL_DEMO_SESSION) === 'true');
  readonly isAuthenticated = this.authenticated.asReadonly();

  startLocalDemoSession(): void {
    sessionStorage.setItem(LOCAL_DEMO_SESSION, 'true');
    this.authenticated.set(true);
  }

  signOut(): void {
    sessionStorage.removeItem(LOCAL_DEMO_SESSION);
    this.authenticated.set(false);
  }
}
