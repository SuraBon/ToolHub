import { describe, expect, it } from "vitest"

import { calculateStockUpdates } from "@/lib/stock-calculation"
import type { Equipment } from "@/types"

const equipment: Equipment[] = [
  {
    id: "EQ001",
    image: "",
    name: "กระดาษ",
    totalStock: 100,
    used: 10,
    remaining: 90,
    baseUnit: "รีม",
    mainUnit: "ลัง",
    ratio: 10,
  },
]

describe("calculateStockUpdates", () => {
  it("combines duplicate equipment rows before deducting stock", () => {
    const result = calculateStockUpdates(
      {
        name: "Tester",
        department: "IT",
        items: [
          {
            equipmentId: "EQ001",
            amount: 2,
            isMainUnit: true,
          },
          {
            equipmentId: "eq001",
            amount: 3,
            isMainUnit: false,
          },
        ],
      },
      equipment,
      "REQ1",
      "1 มกราคม 2569"
    )

    expect(result.stockUpdates).toEqual([
      {
        range: "สต๊อกอุปกรณ์!E2:F2",
        values: [[33, 67]],
      },
    ])
    expect(result.historyRows).toHaveLength(2)
  })

  it("adds request id to history rows when provided", () => {
    const result = calculateStockUpdates(
      {
        name: "Tester",
        department: "IT",
        items: [
          {
            equipmentId: "EQ001",
            amount: 1,
            isMainUnit: false,
          },
        ],
      },
      equipment,
      "REQ1",
      "1 มกราคม 2569",
      "request-1"
    )

    expect(result.historyRows[0]).toEqual([
      "REQ1",
      "1 มกราคม 2569",
      "Tester",
      "IT",
      equipment[0].name,
      1,
      equipment[0].baseUnit,
      "request-1",
    ])
  })

  it("rejects requests that exceed remaining stock after combining rows", () => {
    expect(() =>
      calculateStockUpdates(
        {
          name: "Tester",
          department: "IT",
          items: [
            {
              equipmentId: "EQ001",
              amount: 10,
              isMainUnit: true,
            },
          ],
        },
        equipment,
        "REQ1",
        "1 มกราคม 2569"
      )
    ).toThrow("สต๊อก กระดาษ ไม่เพียงพอ")
  })
})
