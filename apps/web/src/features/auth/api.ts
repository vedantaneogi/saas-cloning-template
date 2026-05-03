import type { AuthUser } from "./store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const authEndpoints = {
  login: `${API_URL}/auth/login`,
  me: `${API_URL}/auth/me`,
  logout: `${API_URL}/auth/logout`,
  config: `${API_URL}/auth/config`,
  testLogin: `${API_URL}/auth/test-login`,
};

export type AuthConfig = {
  test_auth_enabled: boolean;
};

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await fetch(authEndpoints.me, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Unauthenticated");
  }
  return res.json();
}

export async function logoutRequest(): Promise<void> {
  const res = await fetch(authEndpoints.logout, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Logout failed");
  }
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const res = await fetch(authEndpoints.config, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load auth config");
  }
  return res.json();
}

export async function loginWithTestUser(): Promise<AuthUser> {
  const res = await fetch(authEndpoints.testLogin, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Test login is not available");
  }
  return res.json();
}
