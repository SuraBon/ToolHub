import { describe, expect, it } from "vitest"

import { createIdempotencyCache } from "@/lib/idempotency-cache"

describe("createIdempotencyCache", () => {
  it("returns cached data before the TTL expires", () => {
    const cache = createIdempotencyCache<{ requisitionNumber: string }>(1000)
    cache.set("request-1", { requisitionNumber: "REQ1" }, 100)

    expect(cache.get("request-1", 500)).toEqual({ requisitionNumber: "REQ1" })
  })

  it("expires cached data after the TTL", () => {
    const cache = createIdempotencyCache<{ requisitionNumber: string }>(1000)
    cache.set("request-1", { requisitionNumber: "REQ1" }, 100)

    expect(cache.get("request-1", 1100)).toBeNull()
  })
})
