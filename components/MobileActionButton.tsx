"use client"

import * as React from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const MobileActionButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        "min-h-11 w-full gap-2 rounded-xl px-4 font-semibold sm:w-auto",
        className
      )}
      {...props}
    />
  )
})

MobileActionButton.displayName = "MobileActionButton"
