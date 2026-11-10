import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import { AzureSessionService } from './azure-session.service';

export const authGuard: CanActivateFn = async () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  await session.initialize();

  if (session.isAuthenticated() && session.isAdmin()) return true;
  if (session.isAuthenticated()) session.showAdminRequired();
  return router.createUrlTree(['/login'], { fragment: 'admin-title' });
};

export const customerGuard: CanActivateFn = async () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  await session.initialize();

  return session.isAuthenticated() && !session.isAdmin()
    ? true
    : router.createUrlTree(['/login'], { fragment: 'customer-title' });
};

export const operatorGuard: CanActivateFn = () => {
  const azure = inject(AzureSessionService);
  return azure.isAuthenticated() || inject(Router).createUrlTree(['/login'], { fragment: 'operator-title' });
};
