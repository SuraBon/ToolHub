import { describe, expect, it } from "vitest"

import { toBaseUnit } from "@/lib/unit-conversion"

describe("toBaseUnit", () => {
  it("keeps base unit amounts unchanged", () => {
    expect(toBaseUnit(3, false, 10)).toBe(3)
  })

  it("converts main unit amounts with a ratio", () => {
    expect(toBaseUnit(8, true, 10)).toBe(80)
  })

  it("falls back to the original amount when ratio is missing", () => {
    expect(toBaseUnit(5, true)).toBe(5)
  })
})
