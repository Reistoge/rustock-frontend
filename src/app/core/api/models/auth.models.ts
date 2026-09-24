// Derived from docs/api/openapi.json (components.schemas).

export interface LoginInfo {
  email: string;
  password: string;
}

// OpenAPI documents `[LoginResponse]` (an array), but the Rust handler returns
// `Json<LoginResponse>` — a single object. `AuthApi.login` accepts both.
export interface LoginResponse {
  token: string;
}

export interface RegisterInfo {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
}

// JWT claims issued by `create_jwt`: `sub` is the user's email.
export interface JwtClaims {
  sub: string;
  exp: number;
}
