"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Package } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
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
import { Equipment } from "@/types"

interface EquipmentComboboxProps {
  equipment: Equipment[]
  value: string
  onSelect: (value: string) => void
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
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedEquipment ? (
            <div className="flex items-center gap-2">
              {selectedEquipment.image ? (
                <Image
                  src={selectedEquipment.image}
                  alt={selectedEquipment.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded object-cover"
                  unoptimized
                />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="truncate">{selectedEquipment.name}</span>
            </div>
          ) : (
            "เลือกอุปกรณ์..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="ค้นหาอุปกรณ์..." />
          <CommandList>
            <CommandEmpty>ไม่พบอุปกรณ์</CommandEmpty>
            <CommandGroup>
              {equipment.map((eq) => (
                <CommandItem
                  key={eq.id}
                  value={eq.id}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === eq.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {eq.image ? (
                      <Image
                        src={eq.image}
                        alt={eq.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="truncate">{eq.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
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
