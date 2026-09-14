import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService } from '../../core/auth/auth-session.service';

@Component({ selector: 'app-login-page', templateUrl: './login-page.component.html', styleUrl: './login-page.component.scss' })
export class LoginPageComponent {
  constructor(private readonly router: Router, private readonly session: AuthSessionService) {}
  protected startLocalDemo(): void { this.session.startLocalDemoSession(); void this.router.navigate(['/admin']); }
}
