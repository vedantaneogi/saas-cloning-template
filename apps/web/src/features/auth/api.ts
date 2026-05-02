import type { AuthUser } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const authEndpoints = {
  login: `${API_URL}/auth/login`,
  register: `${API_URL}/auth/register`,
  me: `${API_URL}/auth/me`,
  logout: `${API_URL}/auth/logout`,
  config: `${API_URL}/auth/config`,
  testLogin: `${API_URL}/auth/test-login`,
};

export type AuthConfig = {
  test_auth_enabled: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  name: string;
  email: string;
  password: string;
};

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Unauthenticated");
  }
  return res.json();
}

export async function loginRequest(credentials: LoginCredentials): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Invalid credentials");
  }
  return res.json();
}

export async function registerRequest(credentials: RegisterCredentials): Promise<AuthUser> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Registration failed");
  }
  return res.json();
}

export async function logoutRequest(): Promise<void> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Logout failed");
  }
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const res = await fetch("/api/auth/config", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load auth config");
  }
  return res.json();
}

export async function loginWithTestUser(): Promise<AuthUser> {
  const res = await fetch("/api/auth/test-login", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Test login is not available");
  }
  return res.json();
}
