import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = async () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  await session.initialize();

  if (session.isAuthenticated() && session.isAdmin()) return true;
  if (session.isAuthenticated()) session.showAdminRequired();
  return router.createUrlTree(['/login']);
};
