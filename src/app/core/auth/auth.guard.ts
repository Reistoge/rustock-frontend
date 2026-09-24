import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStore } from './session.store';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  if (session.isAuthenticated()) {
    return true;
  }
  session.setToken(null);
  return inject(Router).createUrlTree(['/login']);
};

// Keeps signed-in users away from /login and /register.
export const guestGuard: CanActivateFn = () =>
  inject(SessionStore).isAuthenticated() ? inject(Router).createUrlTree(['/stock']) : true;
