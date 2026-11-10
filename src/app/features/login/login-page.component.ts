import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService, type CognitoProfile } from '../../core/auth/auth-session.service';
import { AzureSessionService } from '../../core/auth/azure-session.service';

@Component({ selector: 'app-login-page', imports: [RouterLink], templateUrl: './login-page.component.html', styleUrl: './login-page.component.scss' })
export class LoginPageComponent {
  protected readonly busy = signal(false);
  constructor(protected readonly session: AuthSessionService, protected readonly azure: AzureSessionService) {}

  protected async registerCustomer(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.session.registerCustomer();
    } finally {
      this.busy.set(false);
    }
  }

  protected async useAccess(profile: 'operator' | CognitoProfile, action: 'signIn' | 'signOut'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (profile === 'operator') {
        await this.azure[action]();
      } else if (action === 'signIn') {
        await this.session.signIn(profile);
      } else {
        await this.session.signOut();
      }
    } finally {
      this.busy.set(false);
    }
  }
}
