"use client"

import * as React from "react"

import type { Equipment } from "@/types"

function getRequisitionHref(equipmentIds: string[]) {
  const uniqueIds = Array.from(new Set(equipmentIds))

  return uniqueIds.length > 0
    ? `/form?equipmentIds=${encodeURIComponent(uniqueIds.join(","))}`
    : "/form"
}

export function useEquipmentSelection(equipment: Equipment[]) {
  const [selectedEquipmentIds, setSelectedEquipmentIds] = React.useState<string[]>([])

  const selectedEquipment = React.useMemo(
    () =>
      selectedEquipmentIds
        .map((equipmentId) => equipment.find((item) => item.id === equipmentId))
        .filter((item): item is Equipment => Boolean(item)),
    [equipment, selectedEquipmentIds]
  )

  const selectedEquipmentIdSet = React.useMemo(
    () => new Set(selectedEquipmentIds),
    [selectedEquipmentIds]
  )

  const requisitionHref = React.useMemo(
    () => getRequisitionHref(selectedEquipmentIds),
    [selectedEquipmentIds]
  )

  const add = React.useCallback((item: Equipment) => {
    if (item.remaining <= 0) return
    setSelectedEquipmentIds((current) =>
      current.includes(item.id) ? current : [...current, item.id]
    )
  }, [])

  const remove = React.useCallback((equipmentId: string) => {
    setSelectedEquipmentIds((current) =>
      current.filter((itemId) => itemId !== equipmentId)
    )
  }, [])

  const clear = React.useCallback(() => {
    setSelectedEquipmentIds([])
  }, [])

  return {
    selectedEquipmentIds,
    selectedEquipment,
    selectedEquipmentIdSet,
    requisitionHref,
    add,
    remove,
    clear,
  }
}
