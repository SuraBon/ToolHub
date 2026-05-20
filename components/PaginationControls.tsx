"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PaginationControlsProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  onPageChange,
  className,
}: PaginationControlsProps) {
  if (totalItems <= pageSize) return null

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  return (
    <div
      className={`flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between ${className || ""}`}
    >
      <span>
        แสดง {startItem}-{endItem} จาก {totalItems} รายการ
      </span>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-11 w-full gap-1 rounded-xl sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          ก่อนหน้า
        </Button>
        <span className="min-w-16 text-center text-xs font-medium text-slate-500">
          {page}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-11 w-full gap-1 rounded-xl sm:w-auto"
        >
          ถัดไป
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
