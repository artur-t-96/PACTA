"use client";

export interface AuthUser {
  username: string;
  name: string;
  role: "admin" | "operator" | "recruiter" | "manager" | "viewer";
  api_key: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("paragraf_token");
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("paragraf_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }
  return { "Content-Type": "application/json" };
}

export function logout() {
  localStorage.removeItem("paragraf_token");
  localStorage.removeItem("paragraf_user");
  window.location.href = "/login";
}

export function isRole(role: string): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

export function hasRole(...roles: string[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

/** Fetch wrapper that automatically injects auth headers. */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
