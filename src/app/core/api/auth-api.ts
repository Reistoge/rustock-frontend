import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SessionStore } from '../auth/session.store';
import { LoginInfo, LoginResponse, RegisterInfo, RegisterResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/user`;

  login(info: LoginInfo): Observable<LoginResponse> {
    return this.http.post<LoginResponse | LoginResponse[]>(`${this.baseUrl}/login`, info).pipe(
      // OpenAPI documents an array, the handler returns an object: accept both.
      map((response) => (Array.isArray(response) ? response[0] : response)),
      tap((response) => this.session.setToken(response.token)),
    );
  }

  register(info: RegisterInfo): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse | RegisterResponse[]>(`${this.baseUrl}/register`, info)
      .pipe(map((response) => (Array.isArray(response) ? response[0] : response)));
  }

  // Documented as text/plain; axum actually wraps it in `Json<String>`.
  info(): Observable<string> {
    return this.http
      .get(`${this.baseUrl}/info`, { responseType: 'text' })
      .pipe(map((body) => unquote(body)));
  }

  logout(): void {
    this.session.setToken(null);
  }
}

function unquote(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    return typeof parsed === 'string' ? parsed : body;
  } catch {
    return body;
  }
}
