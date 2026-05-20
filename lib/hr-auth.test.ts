import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  SESSION_TTL_MS,
  createHrSessionToken,
  verifyHrSessionToken,
} from "@/lib/hr-auth"

describe("HR session tokens", () => {
  const originalPassword = process.env.HR_PASSWORD
  const baseTime = new Date("2026-05-20T07:00:00.000Z").getTime()

  beforeEach(() => {
    process.env.HR_PASSWORD = "test-secret"
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000000"
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()

    if (originalPassword === undefined) {
      delete process.env.HR_PASSWORD
    } else {
      process.env.HR_PASSWORD = originalPassword
    }
  })

  it("creates sessions that last one hour", () => {
    const token = createHrSessionToken(baseTime)

    expect(SESSION_TTL_MS).toBe(60 * 60 * 1000)
    expect(verifyHrSessionToken(token, baseTime + SESSION_TTL_MS - 1)).toBe(
      true
    )
    expect(verifyHrSessionToken(token, baseTime + SESSION_TTL_MS)).toBe(false)
  })

  it("rejects expired session tokens", () => {
    const token = createHrSessionToken(baseTime)

    expect(verifyHrSessionToken(token, baseTime + SESSION_TTL_MS + 1)).toBe(
      false
    )
  })

  it("refreshes sessions by issuing a new valid token", () => {
    const token = createHrSessionToken(baseTime)
    const refreshedToken = createHrSessionToken(baseTime + 30 * 60 * 1000)

    expect(refreshedToken).not.toBe(token)
    expect(
      verifyHrSessionToken(refreshedToken, baseTime + SESSION_TTL_MS)
    ).toBe(true)
  })
})
