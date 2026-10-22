import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthSessionService } from './auth-session.service';
import { AzureSessionService } from './azure-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);

  const session = inject(AuthSessionService);
  const azure = request.url.startsWith('/api/operator/') ? inject(AzureSessionService) : null;
  // An existing Azure session never silently falls back to a more privileged Cognito identity.
  return from(azure?.isAuthenticated() ? azure.accessToken() : session.accessToken()).pipe(
    switchMap((token) => next(token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request)),
  );
};
