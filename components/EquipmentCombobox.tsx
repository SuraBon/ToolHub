"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Package } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

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
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10"
          >
            {selectedEquipment ? (
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0"
                >
                  {selectedEquipment.image ? (
                    <Image
                      src={selectedEquipment.image}
                      alt={selectedEquipment.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-lg object-cover shadow-sm"
                      unoptimized
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                </motion.div>
                <span className="truncate">{selectedEquipment.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">เลือกอุปกรณ์...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </motion.div>
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
                  className="cursor-pointer"
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
                        className="h-6 w-6 rounded-lg object-cover shadow-sm"
                        unoptimized
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
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
