"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MobileActionButton } from "@/components/MobileActionButton"

type ConfirmActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: React.ReactNode
  children?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  loading?: boolean
  loadingLabel?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  onCancel?: () => void
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "ยกเลิก",
  loading = false,
  loadingLabel,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter className="gap-2 sm:gap-0">
          <MobileActionButton
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel}
          </MobileActionButton>
          <MobileActionButton
            type="button"
            variant={variant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingLabel || confirmLabel : confirmLabel}
          </MobileActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
