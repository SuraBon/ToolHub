"use client"

import type { RequisitionForm } from "@/types"

const STORAGE_KEY = "withdrawal.localRequisitionHistory.v1"
const MAX_HISTORY_ITEMS = 50

export type LocalRequisitionHistoryItem = {
  equipmentId: string
  equipmentName: string
  equipmentImage?: string
  amount: number
  unit: string
}

export type LocalRequisitionHistoryEntry = {
  requisitionNumber: string
  requestedAt: string
  name: string
  department: string
  items: LocalRequisitionHistoryItem[]
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function isHistoryEntry(value: unknown): value is LocalRequisitionHistoryEntry {
  if (!value || typeof value !== "object") return false

  const entry = value as Partial<LocalRequisitionHistoryEntry>

  return (
    typeof entry.requisitionNumber === "string" &&
    typeof entry.requestedAt === "string" &&
    typeof entry.name === "string" &&
    typeof entry.department === "string" &&
    Array.isArray(entry.items)
  )
}

export function getLocalRequisitionHistory(): LocalRequisitionHistoryEntry[] {
  if (!canUseLocalStorage()) return []

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) return []

    const parsedValue: unknown = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) return []

    return parsedValue.filter(isHistoryEntry)
  } catch {
    return []
  }
}

export function saveLocalRequisitionHistory(
  entry: LocalRequisitionHistoryEntry
) {
  if (!canUseLocalStorage()) return

  const existingHistory = getLocalRequisitionHistory().filter(
    (item) => item.requisitionNumber !== entry.requisitionNumber
  )
  const nextHistory = [entry, ...existingHistory].slice(0, MAX_HISTORY_ITEMS)

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory))
}

export function clearLocalRequisitionHistory() {
  if (!canUseLocalStorage()) return

  window.localStorage.removeItem(STORAGE_KEY)
}

export function buildLocalHistoryItems(
  data: RequisitionForm,
  getUnit: (item: RequisitionForm["items"][number]) => string
): LocalRequisitionHistoryItem[] {
  return data.items.map((item) => ({
    equipmentId: item.equipmentId,
    equipmentName: item.equipmentName,
    equipmentImage: item.equipmentImage,
    amount: item.amount,
    unit: getUnit(item),
  }))
}
