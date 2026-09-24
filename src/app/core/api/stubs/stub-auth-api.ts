import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { SessionStore } from '../../auth/session.store';
import { LoginInfo, LoginResponse, RegisterInfo, RegisterResponse } from '../models';
import { StubBackend } from './stub-backend';

// Drop-in for `AuthApi` when USE_STUBS is enabled: same public signatures,
// in-memory behavior, session handling included.
@Injectable({ providedIn: 'root' })
export class StubAuthApi {
  private readonly backend = inject(StubBackend);
  private readonly session = inject(SessionStore);

  login(info: LoginInfo): Observable<LoginResponse> {
    return this.backend
      .login(info)
      .pipe(tap((response) => this.session.setToken(response.token)));
  }

  register(info: RegisterInfo): Observable<RegisterResponse> {
    return this.backend.register(info);
  }

  info(): Observable<string> {
    return this.backend.userInfo();
  }

  logout(): void {
    this.session.setToken(null);
  }
}
