import { describe, expect, it } from "vitest"

import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit"

describe("rate limit helper", () => {
  it("blocks requests after the limit is reached", () => {
    const key = "test-login"
    clearRateLimit(key)

    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(false)

    clearRateLimit(key)
  })
})
