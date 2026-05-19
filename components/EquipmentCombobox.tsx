"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown, Package } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Equipment } from "@/types"

interface EquipmentComboboxProps {
  equipment: Equipment[]
  value: string
  onSelect: (value: string) => void
}

function EquipmentThumb({ equipment }: { equipment: Equipment }) {
  return equipment.image ? (
    <Image
      src={equipment.image}
      alt={equipment.name}
      width={28}
      height={28}
      className="h-7 w-7 rounded-lg object-cover shadow-sm"
      unoptimized
    />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
      <Package className="h-4 w-4 text-blue-600" />
    </div>
  )
}

export function EquipmentCombobox({
  equipment,
  value,
  onSelect,
}: EquipmentComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedEquipment = equipment.find((eq) => eq.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
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
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="ค้นหาอุปกรณ์..." />
          <CommandList>
            <CommandEmpty>ไม่พบอุปกรณ์</CommandEmpty>
            <CommandGroup>
              {equipment.map((eq) => (
                <CommandItem
                  key={eq.id}
                  value={`${eq.id} ${eq.name} ${eq.baseUnit} ${eq.mainUnit || ""}`}
                  onSelect={() => {
                    onSelect(eq.id === value ? "" : eq.id)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === eq.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <EquipmentThumb equipment={eq} />
                    <span className="truncate">{eq.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      คงเหลือ: {eq.remaining} {eq.baseUnit}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
