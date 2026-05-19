"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown, Package, Search } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaginationControls } from "@/components/PaginationControls"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Equipment } from "@/types"

const EQUIPMENT_PICKER_PAGE_SIZE = 9

interface EquipmentComboboxProps {
  equipment: Equipment[]
  value: string
  onSelect: (value: string) => void
}

function formatUnit(equipment: Equipment) {
  return equipment.mainUnit
    ? `${equipment.baseUnit}/${equipment.mainUnit}`
    : equipment.baseUnit
}

function equipmentMatchesSearch(equipment: Equipment, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    equipment.name,
    equipment.baseUnit,
    equipment.mainUnit || "",
    String(equipment.remaining),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery)
}

function EquipmentThumb({
  equipment,
  size = "sm",
}: {
  equipment: Equipment
  size?: "sm" | "lg"
}) {
  const className =
    size === "lg"
      ? "h-14 w-14 rounded-xl object-cover shadow-sm"
      : "h-7 w-7 rounded-lg object-cover shadow-sm"
  const iconClassName = size === "lg" ? "h-7 w-7" : "h-4 w-4"
  const boxClassName =
    size === "lg"
      ? "flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100"
      : "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100"

  return equipment.image ? (
    <Image
      src={equipment.image}
      alt={equipment.name}
      width={size === "lg" ? 56 : 28}
      height={size === "lg" ? 56 : 28}
      className={className}
      unoptimized
    />
  ) : (
    <div className={boxClassName}>
      <Package className={cn(iconClassName, "text-blue-600")} />
    </div>
  )
}

export function EquipmentCombobox({
  equipment,
  value,
  onSelect,
}: EquipmentComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const selectedEquipment = equipment.find((eq) => eq.id === value)
  const filteredEquipment = React.useMemo(
    () => equipment.filter((eq) => equipmentMatchesSearch(eq, query)),
    [equipment, query]
  )
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEquipment.length / EQUIPMENT_PICKER_PAGE_SIZE)
  )
  const currentPage = Math.min(page, totalPages)
  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * EQUIPMENT_PICKER_PAGE_SIZE,
    currentPage * EQUIPMENT_PICKER_PAGE_SIZE
  )

  React.useEffect(() => {
    setPage(1)
  }, [query])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setQuery("")
      setPage(1)
    }
  }

  const handleSelect = (equipmentId: string) => {
    onSelect(equipmentId === value ? "" : equipmentId)
    setOpen(false)
    setQuery("")
    setPage(1)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-3rem)]">
          <DialogHeader className="border-b border-slate-100 px-4 py-4 pr-12 sm:px-5">
            <DialogTitle>เลือกอุปกรณ์</DialogTitle>
            <DialogDescription>
              ค้นหาแล้วเลือกอุปกรณ์ที่ต้องการเบิก
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาอุปกรณ์..."
                className="h-11 rounded-xl pl-9"
              />
            </div>

            {filteredEquipment.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                ไม่พบรายการที่ตรงกับคำค้น
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="grid max-h-[58dvh] min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedEquipment.map((eq) => {
                    const selected = value === eq.id
                    const unavailable = eq.remaining <= 0

                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => !unavailable && handleSelect(eq.id)}
                        disabled={unavailable}
                        className={cn(
                          "flex min-w-0 items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          unavailable
                            ? "cursor-not-allowed opacity-55"
                            : "hover:border-blue-200 hover:bg-blue-50",
                          selected
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                            : "border-slate-200"
                        )}
                      >
                        <EquipmentThumb equipment={eq} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {eq.name}
                            </p>
                            {selected ? (
                              <Check className="h-4 w-4 shrink-0 text-blue-600" />
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {unavailable
                              ? "หมดสต๊อก"
                              : `คงเหลือ: ${eq.remaining} ${formatUnit(eq)}`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <PaginationControls
                  page={currentPage}
                  pageSize={EQUIPMENT_PICKER_PAGE_SIZE}
                  totalItems={filteredEquipment.length}
                  onPageChange={setPage}
                  className="shrink-0"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="h-11 w-full justify-between"
          >
            {selectedEquipment ? (
              <div className="flex min-w-0 items-center gap-2">
                <EquipmentThumb equipment={selectedEquipment} />
                <span className="truncate">{selectedEquipment.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">เลือกอุปกรณ์...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </motion.div>
      </div>
    </>
  )
}
