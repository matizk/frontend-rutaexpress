import { Component } from '@angular/core';
import { AuthSessionService } from '../../core/auth/auth-session.service';

@Component({ selector: 'app-login-page', templateUrl: './login-page.component.html', styleUrl: './login-page.component.scss' })
export class LoginPageComponent {
  constructor(protected readonly session: AuthSessionService) {}
  protected signIn(): void { void this.session.signIn(); }
}
