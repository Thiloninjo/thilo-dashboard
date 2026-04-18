const SERVER_BASE = "https://46-225-160-248.nip.io/api";
const LOCAL_BASE = "/api";
const AUTH_HEADER = "Bearer thilo-dashboard-2026-secret";
const SERVER_TIMEOUT = 5_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE = 1_000; // 1s, 2s, 4s

async function tryFetch<T>(url: string, options?: RequestInit, timeout?: number): Promise<T | null> {
  try {
    const controller = timeout ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : undefined;
    const res = await fetch(url, {
      ...options,
      signal: controller?.signal,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (timer) clearTimeout(timer);
    if (res.ok) return res.json();
  } catch {}
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Local first, Hetzner fallback, retry with backoff on total failure
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // For mutations (POST/PATCH/DELETE), don't retry — just try local then Hetzner
  const method = options?.method?.toUpperCase() || "GET";
  const isMutation = method !== "GET";

  const attempts = isMutation ? 1 : MAX_RETRIES;

  for (let i = 0; i < attempts; i++) {
    // Try local backend first
    const local = await tryFetch<T>(`${LOCAL_BASE}${path}`, options);
    if (local !== null) return local;

    // Fallback to Hetzner
    const server = await tryFetch<T>(`${SERVER_BASE}${path}`, {
      ...options,
      headers: { Authorization: AUTH_HEADER, ...options?.headers },
    }, SERVER_TIMEOUT);
    if (server !== null) return server;

    // Backoff before retry (skip on last attempt)
    if (i < attempts - 1) {
      await sleep(BACKOFF_BASE * Math.pow(2, i));
    }
  }

  throw new Error(`API unreachable after ${attempts} attempts: ${path}`);
}
