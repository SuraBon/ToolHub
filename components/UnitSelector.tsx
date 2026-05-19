"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Equipment } from "@/types"

interface UnitSelectorProps {
  equipment: Equipment | null
  value: boolean
  onValueChange: (value: boolean) => void
}

export function UnitSelector({
  equipment,
  value,
  onValueChange,
}: UnitSelectorProps) {
  if (!equipment || !equipment.mainUnit || !equipment.ratio) {
    return (
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        {equipment?.baseUnit || '-'}
      </div>
    )
  }

  return (
    <Select
      value={value ? "main" : "base"}
      onValueChange={(val) => onValueChange(val === "main")}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="main">
          {equipment.mainUnit} (1 {equipment.mainUnit} = {equipment.ratio} {equipment.baseUnit})
        </SelectItem>
        <SelectItem value="base">{equipment.baseUnit}</SelectItem>
      </SelectContent>
    </Select>
  )
}
