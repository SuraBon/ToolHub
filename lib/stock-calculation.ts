import type { Equipment } from "@/types"
import type { RequisitionPayload } from "@/lib/validation"
import { stockUsageRange } from "@/lib/google-sheets-ranges"
import { toBaseUnit } from "@/lib/unit-conversion"
import { formatRemainingQuantity } from "@/lib/equipment-utils"

type StockUpdate = {
  range: string
  values: number[][]
}

type StockCalculationResult = {
  stockUpdates: StockUpdate[]
  historyRows: unknown[][]
}

export function calculateStockUpdates(
  requisition: RequisitionPayload,
  equipmentData: Equipment[],
  requisitionNumber: string,
  formattedDate: string
): StockCalculationResult {
  const equipmentById = new Map(equipmentData.map((equipment) => [equipment.id, equipment]))
  const equipmentByNormalizedId = new Map(
    equipmentData.map((equipment) => [equipment.id.toLowerCase(), equipment])
  )
  const requestedBaseUnitsByEquipmentId = new Map<string, number>()
  const historyRows: unknown[][] = []

  for (const item of requisition.items) {
    const requestedEquipmentId = item.equipmentId.trim()
    const equipment =
      equipmentById.get(requestedEquipmentId) ||
      equipmentByNormalizedId.get(requestedEquipmentId.toLowerCase())

    if (!equipment) {
      throw new Error(`ไม่พบอุปกรณ์รหัส ${requestedEquipmentId}`)
    }

    if (item.isMainUnit && (!equipment.mainUnit || !equipment.ratio)) {
      throw new Error(`อุปกรณ์ ${equipment.name} ไม่มีหน่วยใหญ่ให้เลือกเบิก`)
    }

    const amountInBaseUnits = toBaseUnit(
      item.amount,
      item.isMainUnit,
      equipment.ratio
    )

    if (!Number.isFinite(amountInBaseUnits) || amountInBaseUnits <= 0) {
      throw new Error(`จำนวนเบิกของ ${equipment.name} ไม่ถูกต้อง`)
    }

    requestedBaseUnitsByEquipmentId.set(
      equipment.id,
      (requestedBaseUnitsByEquipmentId.get(equipment.id) || 0) + amountInBaseUnits
    )

    historyRows.push([
      requisitionNumber,
      formattedDate,
      requisition.name,
      requisition.department,
      equipment.name,
      item.amount,
      item.isMainUnit && equipment.mainUnit ? equipment.mainUnit : equipment.baseUnit,
    ])
  }

  const stockUpdates: StockUpdate[] = []

  for (const [equipmentId, requestedBaseUnits] of requestedBaseUnitsByEquipmentId) {
    const equipmentIndex = equipmentData.findIndex(
      (equipment) => equipment.id === equipmentId
    )
    const equipment = equipmentData[equipmentIndex]

    if (!equipment) {
      throw new Error(`ไม่พบอุปกรณ์รหัส ${equipmentId}`)
    }

    if (requestedBaseUnits > equipment.remaining) {
      throw new Error(
        `สต๊อก ${equipment.name} ไม่เพียงพอ คงเหลือ ${formatRemainingQuantity(equipment)}`
      )
    }

    const rowIndex = equipmentIndex + 2

    stockUpdates.push({
      range: stockUsageRange(rowIndex),
      values: [[equipment.used + requestedBaseUnits, equipment.remaining - requestedBaseUnits]],
    })
  }

  return { stockUpdates, historyRows }
}
