import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from './dto/login.dto';
import { RegisterRequest, RegisterResponse } from './dto/register.dto';

const TOKEN_STORAGE_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  protected readonly token = signal<string | null>(this.readStoredToken());

  readonly isAuthenticated = () => this.token() !== null;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/user/login`, request)
      .pipe(tap((response) => this.setToken(response.token)));
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiBaseUrl}/user/register`, request);
  }

  logout(): void {
    this.setToken(null);
  }

  private setToken(token: string | null): void {
    this.token.set(token);
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // localStorage can be unavailable (SSR, private browsing) — the in-memory
      // signal above still works for the current session.
    }
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
