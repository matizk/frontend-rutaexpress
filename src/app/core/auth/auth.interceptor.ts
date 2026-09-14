import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthSessionService } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);

  const session = inject(AuthSessionService);
  return from(session.accessToken()).pipe(
    switchMap((token) => next(token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request)),
  );
};
