/**
 * Auth helpers for frontend
 */

export interface User {
  username: string;
  name: string;
  role: string;
  api_key: string;
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("paragraf_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("paragraf_user");
  window.location.href = "/login";
}

export function isAdmin(): boolean {
  return getUser()?.role === "admin";
}

export function isManager(): boolean {
  const role = getUser()?.role;
  return role === "admin" || role === "manager";
}

export function canCreate(): boolean {
  const role = getUser()?.role;
  return !role || role !== "viewer"; // If no auth, allow all
}

export function canDelete(): boolean {
  const role = getUser()?.role;
  return role === "admin" || role === "manager";
}

export function canExport(): boolean {
  const role = getUser()?.role;
  return !role || role === "admin" || role === "manager";
}
