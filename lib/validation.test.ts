import { describe, expect, it } from "vitest"

import {
  validateEquipmentPayload,
  validateRequisitionPayload,
} from "@/lib/validation"

describe("validation helpers", () => {
  it("rejects invalid requisition amounts", () => {
    expect(() =>
      validateRequisitionPayload({
        name: "Tester",
        department: "IT",
        items: [
          {
            equipmentId: "EQ001",
            amount: 0,
            isMainUnit: false,
          },
        ],
      })
    ).toThrow("จำนวนต้องมากกว่า 0")
  })

  it("rejects equipment where used stock exceeds total stock", () => {
    expect(() =>
      validateEquipmentPayload({
        name: "กระดาษ",
        totalStock: 1,
        used: 2,
        baseUnit: "รีม",
      })
    ).toThrow("จำนวนที่ใช้ไปต้องไม่มากกว่าสต๊อกรวม")
  })
})
