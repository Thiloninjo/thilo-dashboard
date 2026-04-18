const BASE = "/api";
export async function apiFetch(path, options) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!res.ok)
        throw new Error(`API error: ${res.status}`);
    return res.json();
}
