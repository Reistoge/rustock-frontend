import { Injectable, computed, signal } from '@angular/core';

import { JwtClaims } from '../api/models';

const TOKEN_STORAGE_KEY = 'auth_token';

// Holds the JWT for the current session. HTTP lives in `AuthApi`; this store
// only persists the token and exposes what the UI needs from its claims.
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly tokenState = signal<string | null>(readStoredToken());

  readonly token = this.tokenState.asReadonly();
  readonly claims = computed(() => decodeClaims(this.tokenState()));
  readonly email = computed(() => this.claims()?.sub ?? '');

  isAuthenticated(): boolean {
    const claims = this.claims();
    // `exp` is in seconds (the backend issues 1-hour tokens).
    return claims !== null && claims.exp * 1000 > Date.now();
  }

  setToken(token: string | null): void {
    this.tokenState.set(token);
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // localStorage is unavailable during SSR or in some private windows —
      // the in-memory signal still covers the current session.
    }
  }
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function decodeClaims(token: string | null): JwtClaims | null {
  const payload = token?.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims: unknown = JSON.parse(json);
    return isClaims(claims) ? claims : null;
  } catch {
    return null;
  }
}

function isClaims(value: unknown): value is JwtClaims {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as JwtClaims).sub === 'string' &&
    typeof (value as JwtClaims).exp === 'number'
  );
}
