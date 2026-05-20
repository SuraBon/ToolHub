import type { Equipment } from "@/types"

export type StockFilter = "all" | "available" | "out"

export const stockFilterLabels: Record<StockFilter, string> = {
  all: "ทั้งหมด",
  available: "ยังมีสต๊อก",
  out: "หมดสต๊อก",
}

export function formatEquipmentUnit(equipment: Equipment) {
  return equipment.mainUnit
    ? `${equipment.baseUnit}/${equipment.mainUnit}`
    : equipment.baseUnit
}

export function formatRemainingQuantity(equipment: Equipment) {
  const remaining = Math.max(0, equipment.remaining)
  const ratio = equipment.ratio || 0

  if (!equipment.mainUnit || ratio <= 0) {
    return `${remaining} ${equipment.baseUnit}`
  }

  const mainAmount = Math.floor(remaining / ratio)
  const baseAmount = remaining % ratio
  const parts = []

  if (mainAmount > 0) {
    parts.push(`${mainAmount} ${equipment.mainUnit}`)
  }

  if (baseAmount > 0) {
    parts.push(`${baseAmount} ${equipment.baseUnit}`)
  }

  return parts.length > 0 ? parts.join(" ") : `0 ${equipment.baseUnit}`
}

export function equipmentMatchesSearch(equipment: Equipment, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    equipment.id,
    equipment.name,
    equipment.baseUnit,
    equipment.mainUnit || "",
    String(equipment.totalStock),
    String(equipment.used),
    String(equipment.remaining),
    formatRemainingQuantity(equipment),
    equipment.remaining <= 0 ? "หมด" : "พร้อมเบิก",
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery)
}

export function equipmentMatchesFilter(
  equipment: Equipment,
  filter: StockFilter
) {
  if (filter === "available") return equipment.remaining > 0
  if (filter === "out") return equipment.remaining <= 0
  return true
}

function getEquipmentSortNumber(id: string) {
  const match = id.match(/^EQ(\d+)$/i)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

export function sortEquipmentById(items: Equipment[]) {
  return [...items].sort((a, b) => {
    const numberDiff = getEquipmentSortNumber(a.id) - getEquipmentSortNumber(b.id)
    if (numberDiff !== 0) return numberDiff
    return a.id.localeCompare(b.id)
  })
}

export function getStockStatus(equipment: Equipment) {
  if (equipment.remaining <= 0) {
    return {
      label: "หมดสต๊อก",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    }
  }

  return {
    label: "พร้อมเบิก",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  }
}
