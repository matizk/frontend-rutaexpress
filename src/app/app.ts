import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthSessionService } from './core/auth/auth-session.service';
import { AzureSessionService } from './core/auth/azure-session.service';

type Workspace = 'admin' | 'operator' | 'customer';

const workspaceLabels: Record<Workspace, string> = {
  admin: 'Administrador · Cognito',
  operator: 'Operador · Microsoft',
  customer: 'Cliente · Cognito',
};

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly session = inject(AuthSessionService);
  private readonly azure = inject(AzureSessionService);
  private readonly router = inject(Router);
  private readonly lastWorkspace = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(() => this.router.routerState.snapshot.root.firstChild?.data['workspace'] as Workspace | undefined),
    filter(workspace => workspace !== undefined),
  ));

  protected readonly profile = computed(() => {
    const cognitoWorkspace = this.session.isAuthenticated()
      ? this.session.isAdmin() ? 'admin' : 'customer'
      : null;
    if (this.azure.isAuthenticated() && (this.lastWorkspace() === 'operator' || !cognitoWorkspace)) {
      return { workspace: 'operator' as const, label: workspaceLabels.operator, name: this.azure.displayName() };
    }
    return cognitoWorkspace
      ? { workspace: cognitoWorkspace, label: workspaceLabels[cognitoWorkspace], name: this.session.displayName() }
      : null;
  });

  protected readonly accessLabel = computed(() => {
    if (this.azure.isAuthenticated() && this.session.isAuthenticated()) return 'Cambiar perfil';
    return this.profile() ? 'Mi acceso' : 'Acceder';
  });
}
