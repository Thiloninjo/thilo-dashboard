interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<any>>();

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
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
