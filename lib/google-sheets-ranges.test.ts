import { describe, expect, it } from "vitest"

import { HISTORY_SHEET_NAME, historyRowsRange } from "@/lib/google-sheets-ranges"

describe("historyRowsRange", () => {
  it("builds a fixed multi-row history range", () => {
    expect(historyRowsRange(5, 3)).toBe(`${HISTORY_SHEET_NAME}!A5:G7`)
  })
})
