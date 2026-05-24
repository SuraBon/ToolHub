import { describe, expect, it } from "vitest"

import {
  GOOGLE_SHEETS_QUOTA_MESSAGE,
  isGoogleSheetsQuotaError,
} from "@/lib/google-sheets-errors"

describe("isGoogleSheetsQuotaError", () => {
  it("detects Google Sheets read quota errors", () => {
    expect(
      isGoogleSheetsQuotaError(
        new Error(
          "Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com'"
        )
      )
    ).toBe(true)
  })

  it("does not treat unrelated errors as quota errors", () => {
    expect(isGoogleSheetsQuotaError(new Error("Network connection failed"))).toBe(false)
  })

  it("detects 429 responses as quota errors", () => {
    expect(isGoogleSheetsQuotaError(new Error("Request failed with status 429"))).toBe(true)
  })

  it("exports the user-facing retry message", () => {
    expect(GOOGLE_SHEETS_QUOTA_MESSAGE).toContain("รอสักครู่")
  })
})
