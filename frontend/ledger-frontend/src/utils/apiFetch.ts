const API_BASE = "http://localhost:3001";

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = input.startsWith("http") ? input : `${API_BASE}${input}`;
  const options: RequestInit = { ...init, credentials: "include" };

  const response = await fetch(url, options);

  if (response.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      return fetch(url, options);
    }

    window.dispatchEvent(new Event("auth:session-expired"));
  }

  return response;
}

export { API_BASE };
