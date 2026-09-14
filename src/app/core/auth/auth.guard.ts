import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const session = inject(AuthSessionService);
  if (!session.isConfigured()) {
    return inject(Router).createUrlTree(['/login']);
  }

  return inject(MsalGuard).canActivate(route, state);
};
