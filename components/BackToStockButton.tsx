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
  const handleBack = () => {
    onBack?.()
    router.replace("/")

    window.setTimeout(() => {
      if (window.location.pathname !== "/" || window.location.search) {
        window.location.assign("/")
      }
    }, 150)
  }

  return (
    <MobileActionButton
      type="button"
      variant={variant}
      onClick={handleBack}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      กลับไปยังคลังอุปกรณ์
    </MobileActionButton>
  )
}
