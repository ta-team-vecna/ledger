import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext, type User } from "./authContext.shared";
import { apiFetch, API_BASE } from "../utils/apiFetch";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // check auth status
  useEffect(() => {
    checkAuth();
  }, []);

  // auto-logout when refresh token fails
  useEffect(() => {
    function onSessionExpired() {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).finally(() => setUser(null));
    }

    window.addEventListener("auth:session-expired", onSessionExpired);
    return () =>
      window.removeEventListener("auth:session-expired", onSessionExpired);
  }, []);

  async function checkAuth() {
    try {
      const res = await apiFetch(`${API_BASE}/api/auth/me`);
      if (!res.ok) {
        setUser(null);
        return;
      }

      const me = await res.json();

      const userRes = await apiFetch(`${API_BASE}/api/users/${me.userId}`);
      const role = userRes.ok ? (await userRes.json()).role : me.role;

      setUser({ ...me, role });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await res.json();

    const userRes = await apiFetch(`${API_BASE}/api/users/${data.userId}`);
    const role = userRes.ok ? (await userRes.json()).role : data.role;

    setUser({
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role,
    });
  }

  async function register(firstName: string, lastName: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Registration failed");
    }

    const data = await res.json();

    const userRes = await apiFetch(`${API_BASE}/api/users/${data.userId}`);
    const role = userRes.ok ? (await userRes.json()).role : data.role;

    setUser({
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role,
    });
  }

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
