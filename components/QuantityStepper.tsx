"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

interface QuantityStepperProps {
  id?: string
  value: string | number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  inputClassName?: string
  onValueChange: (value: string) => void
}

function parseQuantity(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clampQuantity(value: number, min: number, max?: number) {
  const withMin = Math.max(min, value)
  return typeof max === "number" ? Math.min(max, withMin) : withMin
}

export function QuantityStepper({
  id,
  value,
  min = 0,
  max,
  step = 1,
  disabled = false,
  className,
  inputClassName,
  onValueChange,
}: QuantityStepperProps) {
  const updateByStep = (direction: -1 | 1) => {
    const currentValue = value === "" ? min : parseQuantity(value)
    const nextValue = clampQuantity(currentValue + direction * step, min, max)
    onValueChange(String(nextValue))
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/[^\d]/g, "")

    if (nextValue === "") {
      onValueChange("")
      return
    }

    onValueChange(String(clampQuantity(Number(nextValue), min, max)))
  }

  const numericValue = value === "" ? "" : String(value)
  const canDecrease = disabled || parseQuantity(value) <= min
  const canIncrease =
    disabled || (typeof max === "number" && parseQuantity(value) >= max)

  return (
    <div
      className={cn(
        "inline-flex h-10 w-full max-w-36 overflow-hidden rounded-md border border-input bg-background text-foreground ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50",
        className
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={numericValue}
        onChange={handleInputChange}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-3 text-center text-sm font-medium outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
          inputClassName
        )}
      />
      <button
        type="button"
        onClick={() => updateByStep(-1)}
        disabled={canDecrease}
        className="flex w-10 shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="ลดจำนวน"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => updateByStep(1)}
        disabled={canIncrease}
        className="flex w-10 shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="เพิ่มจำนวน"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
