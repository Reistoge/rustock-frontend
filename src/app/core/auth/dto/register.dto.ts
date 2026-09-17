// `username` matches the backend's `RegisterInfo` JSON shape, even though
// it is stored as the `User.name` column.
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
}
