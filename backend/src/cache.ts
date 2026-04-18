interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<any>>();

/**
 * Set cache entry. Returns true if data actually changed, false if identical.
 */
export function cacheSet<T>(key: string, data: T): boolean {
  const prev = store.get(key);
  const json = JSON.stringify(data);
  if (prev && JSON.stringify(prev.data) === json) {
    // Data unchanged — update timestamp but signal no change
    prev.timestamp = Date.now();
    return false;
  }
  store.set(key, { data, timestamp: Date.now() });
  return true;
}

export function cacheHas(key: string): boolean {
  return store.has(key);
}

export function isReady(): boolean {
  return store.has("calendar") && store.has("todoist");
}

export function cacheGet<T>(key: string): { data: T; lastUpdated: string; isStale: boolean } | null {
  const entry = store.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  const isStale = age > 120_000;

  return {
    data: entry.data,
    lastUpdated: new Date(entry.timestamp).toISOString(),
    isStale,
  };
}
