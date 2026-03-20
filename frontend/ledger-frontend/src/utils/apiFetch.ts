const API_BASE = "http://localhost:3001";

let refreshPromise: Promise<boolean> | null = null;
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

function drainQueue() {
  pendingQueue.forEach((resolve) => resolve());
  pendingQueue = [];
}

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

function waitForRefresh(): Promise<void> {
  return new Promise((resolve) => {
    pendingQueue.push(resolve);
  });
}

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = input.startsWith("http") ? input : `${API_BASE}${input}`;
  const options: RequestInit = { ...init, credentials: "include" };

  // if a refresh is already in progress, wait for it before even trying
  if (isRefreshing) {
    await waitForRefresh();
    return fetch(url, options);
  }

  const response = await fetch(url, options);

  if (response.status === 401) {
    // first request to notice 401 kicks off refresh
    if (!refreshPromise) {
      isRefreshing = true;
      refreshPromise = refreshTokens().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
        drainQueue();
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
