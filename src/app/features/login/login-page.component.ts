import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AzureSessionService } from '../../core/auth/azure-session.service';

@Component({ selector: 'app-login-page', imports: [RouterLink], templateUrl: './login-page.component.html', styleUrl: './login-page.component.scss' })
export class LoginPageComponent {
  protected readonly busy = signal(false);
  constructor(protected readonly session: AuthSessionService, protected readonly azure: AzureSessionService) {}

  protected async useAccess(profile: 'operator' | 'admin', action: 'signIn' | 'signOut'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const provider = profile === 'operator' ? this.azure : this.session;
      await provider[action]();
    } finally {
      this.busy.set(false);
    }
  }
}
