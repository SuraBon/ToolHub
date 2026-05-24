import { describe, expect, it } from "vitest"

import {
  GOOGLE_SHEETS_QUOTA_MESSAGE,
} from "@/lib/google-sheets-errors"
import { buildErrorManagementStatus } from "@/lib/management-status"

describe("buildErrorManagementStatus", () => {
  it("reports quota errors clearly", () => {
    const status = buildErrorManagementStatus(
      new Error("Quota exceeded for service sheets.googleapis.com")
    )

    expect(status.ok).toBe(false)
    expect(status.googleSheetsReady).toBe(false)
    expect(status.error).toBe(GOOGLE_SHEETS_QUOTA_MESSAGE)
  })

  it("reports missing spreadsheet configuration clearly", () => {
    const status = buildErrorManagementStatus(
      new Error("Requested entity was not found")
    )

    expect(status.error).toContain("SPREADSHEET_ID")
  })
})
