import { describe, expect, it } from "vitest"

import { formatRemainingQuantity } from "@/lib/equipment-utils"
import type { Equipment } from "@/types"

const baseEquipment: Equipment = {
  id: "EQ001",
  image: "",
  name: "กระดาษ",
  totalStock: 100,
  used: 48,
  remaining: 52,
  baseUnit: "รีม",
  mainUnit: "ลัง",
  ratio: 10,
}

describe("formatRemainingQuantity", () => {
  it("displays remaining stock as main and base units", () => {
    expect(formatRemainingQuantity(baseEquipment)).toBe("5 ลัง 2 รีม")
  })

  it("uses the base unit when equipment has no main unit", () => {
    expect(
      formatRemainingQuantity({
        ...baseEquipment,
        mainUnit: "",
        ratio: 0,
        remaining: 12,
        baseUnit: "ด้าม",
      })
    ).toBe("12 ด้าม")
  })

  it("keeps zero stock readable", () => {
    expect(formatRemainingQuantity({ ...baseEquipment, remaining: 0 })).toBe(
      "0 รีม"
    )
  })
})
