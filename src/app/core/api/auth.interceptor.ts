import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SessionStore } from '../auth/session.store';

// Adds `Authorization: Bearer <token>` to API calls and sends the user back to
// /login when the backend rejects an expired or invalid token.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const token = session.token();
  const isApiCall = request.url.startsWith(environment.apiBaseUrl);

  const authorized =
    token && isApiCall
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      const isLogin = request.url.endsWith('/user/login');
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !isLogin) {
        session.setToken(null);
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
