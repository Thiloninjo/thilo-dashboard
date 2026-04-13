const SERVER_BASE = "https://46-225-160-248.nip.io/api";
const LOCAL_BASE = "/api";
const AUTH_HEADER = "Bearer thilo-dashboard-2026-secret";

// Everything goes to server first (24/7), fallback to local if server unreachable
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${SERVER_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": AUTH_HEADER,
        ...options?.headers,
      },
    });
    if (res.ok) return res.json();
  } catch {}

  // Fallback to local
  const res = await fetch(`${LOCAL_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
