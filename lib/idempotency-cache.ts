type CacheEntry<T> = {
  data: T
  expiresAt: number
}

export function createIdempotencyCache<T>(ttlMs: number) {
  const cache = new Map<string, CacheEntry<T>>()

  function cleanup(now = Date.now()) {
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key)
      }
    }
  }

  return {
    get(key: string, now = Date.now()) {
      cleanup(now)
      return cache.get(key)?.data ?? null
    },
    set(key: string, data: T, now = Date.now()) {
      cleanup(now)
      cache.set(key, {
        data,
        expiresAt: now + ttlMs,
      })
    },
    cleanup,
  }
}
