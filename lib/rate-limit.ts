type RateLimitState = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

const buckets = new Map<string, RateLimitState>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1

  return { allowed: true, retryAfterSeconds: 0 }
}

export function clearRateLimit(key: string) {
  buckets.delete(key)
}
