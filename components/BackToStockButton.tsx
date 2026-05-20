"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

import { MobileActionButton } from "@/components/MobileActionButton"
import type { ButtonProps } from "@/components/ui/button"

type BackToStockButtonProps = Omit<ButtonProps, "children" | "onClick" | "type"> & {
  onBack?: () => void
}

export function BackToStockButton({
  onBack,
  variant = "outline",
  ...props
}: BackToStockButtonProps) {
  const router = useRouter()

  return (
    <MobileActionButton
      type="button"
      variant={variant}
      onClick={onBack || (() => router.push("/"))}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      กลับไปยังคลังอุปกรณ์
    </MobileActionButton>
  )
}
