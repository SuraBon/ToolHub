import { describe, expect, it } from "vitest"

import {
  HISTORY_SHEET_NAME,
  historyReadRange,
  historyRowRange,
  historyRowsRange,
} from "@/lib/google-sheets-ranges"

describe("historyRowsRange", () => {
  it("builds a fixed multi-row history range", () => {
    expect(historyRowsRange(5, 3)).toBe(`${HISTORY_SHEET_NAME}!A5:I7`)
  })

  it("reads and writes the request id column", () => {
    expect(historyReadRange()).toBe(`${HISTORY_SHEET_NAME}!A2:I`)
    expect(historyRowRange(5)).toBe(`${HISTORY_SHEET_NAME}!A5:I5`)
  })
})
