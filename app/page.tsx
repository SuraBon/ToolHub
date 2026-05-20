"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  ClipboardList,
  Package,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { PaginationControls } from "@/components/PaginationControls"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { apiGet } from "@/lib/client-api"
import {
  type StockFilter,
  equipmentMatchesFilter,
  equipmentMatchesSearch,
  formatRemainingQuantity,
  sortEquipmentById,
  stockFilterLabels,
} from "@/lib/equipment-utils"
import { paginateItems } from "@/lib/pagination"
import type { Equipment } from "@/types"
import HRDashboard from "@/components/HRDashboard"

const STOCK_PAGE_SIZE = 12

function getRequisitionHref(equipmentIds: string[]) {
  const uniqueIds = Array.from(new Set(equipmentIds))

  return uniqueIds.length > 0
    ? `/form?equipmentIds=${encodeURIComponent(uniqueIds.join(","))}`
    : "/form"
}

function EquipmentImage({ item, size = 44 }: { item: Equipment; size?: number }) {
  return item.image ? (
    <Image
      src={item.image}
      alt={item.name}
      width={size}
      height={size}
      className="rounded-lg object-cover"
      style={{ width: size, height: size }}
      unoptimized
    />
  ) : (
    <div
      className="flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"
      style={{ width: size, height: size }}
    >
      <Package className="h-5 w-5" />
    </div>
  )
}

function StockOverviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showManagement, setShowManagement] = React.useState(false)
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all")
  const [stockPage, setStockPage] = React.useState(1)
  const [selectedEquipmentIds, setSelectedEquipmentIds] = React.useState<string[]>([])
  const { toast } = useToast()

  const fetchEquipment = React.useCallback(async () => {
    try {
      const data = await apiGet<Equipment[]>("/api/equipment?scope=all")
      setEquipment(Array.isArray(data) ? sortEquipmentById(data) : [])
    } catch (error) {
      console.error("Error fetching equipment:", error)
      setEquipment([])
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลสต๊อกได้",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchEquipment()
  }, [fetchEquipment])

  React.useEffect(() => {
    setStockPage(1)
  }, [searchQuery, stockFilter])

  const isManagementRoute = searchParams.get("view") === "management"

  const filteredEquipment = equipment.filter(
    (item) =>
      equipmentMatchesFilter(item, stockFilter) &&
      equipmentMatchesSearch(item, searchQuery)
  )
  const selectedEquipment = selectedEquipmentIds
    .map((equipmentId) => equipment.find((item) => item.id === equipmentId))
    .filter((item): item is Equipment => Boolean(item))
  const selectedEquipmentIdSet = new Set(selectedEquipmentIds)
  const requisitionHref = getRequisitionHref(selectedEquipmentIds)
  const {
    currentPage: currentStockPage,
    items: paginatedEquipment,
  } = paginateItems(filteredEquipment, stockPage, STOCK_PAGE_SIZE)

  const addToSelection = (item: Equipment) => {
    if (item.remaining <= 0) return
    setSelectedEquipmentIds((current) =>
      current.includes(item.id) ? current : [...current, item.id]
    )
  }

  const removeFromSelection = (equipmentId: string) => {
    setSelectedEquipmentIds((current) =>
      current.filter((itemId) => itemId !== equipmentId)
    )
  }

  if (showManagement || isManagementRoute) {
    return (
      <HRDashboard
        onBackToStock={() => {
          setShowManagement(false)
          router.replace("/")
        }}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_32%,#f1f5f9_100%)] pb-24 text-slate-950 md:pb-0">
      <Toaster />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                คลังอุปกรณ์
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                ตรวจสอบจำนวนคงเหลือและสถานะอุปกรณ์ทั้งหมดก่อนทำรายการเบิก
              </p>
            </div>
            <div className="grid w-full gap-3 sm:w-auto lg:flex">
              <Button
                variant="outline"
                className="h-12 w-full gap-2 rounded-2xl border-slate-200 bg-white/95 px-5 text-base font-semibold shadow-md shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setShowManagement(true)
                  router.replace("/?view=management")
                }}
              >
                <Settings className="h-4 w-4" />
                จัดการสต๊อก
              </Button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6">
            <div className="mb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                    <Package className="h-5 w-5 text-blue-600" />
                    รายการสต๊อก
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    กำลังแสดง: {stockFilterLabels[stockFilter]} · พบ {filteredEquipment.length} รายการ
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_190px] lg:max-w-xl">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="ค้นหารหัส ชื่อ หน่วย หรือสถานะ"
                      className="h-11 rounded-xl border-slate-200 bg-white pl-9"
                    />
                  </div>
                  <Select
                    value={stockFilter}
                    onValueChange={(value) => setStockFilter(value as StockFilter)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-medium">
                      <div className="flex min-w-0 items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="available">ยังมีสต๊อก</SelectItem>
                      <SelectItem value="out">หมดสต๊อก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold text-blue-950">
                    <ShoppingCart className="h-5 w-5 text-blue-700" />
                    รายการที่เลือกไว้
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                      {selectedEquipment.length}
                    </span>
                  </div>
                  {selectedEquipment.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedEquipment.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
                        >
                          <span className="max-w-[180px] truncate">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFromSelection(item.id)}
                            className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                            aria-label={`ลบ ${item.name} ออกจากรายการที่เลือก`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-blue-800">
                      เลือกอุปกรณ์จากรายการด้านล่างก่อน แล้วค่อยไปกรอกข้อมูลผู้เบิก
                    </p>
                  )}
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                  <Button
                    asChild={selectedEquipment.length > 0}
                    disabled={selectedEquipment.length === 0}
                    className="h-11 w-full gap-2 rounded-xl lg:w-auto"
                  >
                    {selectedEquipment.length > 0 ? (
                      <Link href={requisitionHref}>
                        <ClipboardList className="h-4 w-4" />
                        ไปกรอกฟอร์มเบิก
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        ไปกรอกฟอร์มเบิก
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={selectedEquipment.length === 0}
                    onClick={() => setSelectedEquipmentIds([])}
                    className="h-11 w-full gap-2 rounded-xl border-blue-100 bg-white lg:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    ล้างรายการ
                  </Button>
                </div>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : equipment.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  ยังไม่มีอุปกรณ์ในระบบ
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  ไม่พบรายการที่ตรงกับคำค้น
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedEquipment.map((item) => {
                      const selected = selectedEquipmentIdSet.has(item.id)
                      const unavailable = item.remaining <= 0

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[64px_minmax(0,1fr)_minmax(112px,150px)] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                        >
                          <EquipmentImage item={item} size={64} />
                          <div className="flex min-w-0 flex-col justify-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {item.name}
                            </p>
                            <p className="text-lg font-bold text-slate-950">
                              {formatRemainingQuantity(item)}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            {unavailable ? (
                              <Button
                                type="button"
                                disabled
                                variant="outline"
                                className="h-10 w-full rounded-xl px-3"
                              >
                                หมดสต๊อก
                              </Button>
                            ) : selected ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => removeFromSelection(item.id)}
                                  className="h-10 w-full gap-2 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                >
                                  <Check className="h-4 w-4" />
                                  เลือกแล้ว
                                </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addToSelection(item)}
                                className="h-10 w-full gap-2 rounded-xl border-blue-100 bg-blue-50 px-3 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                เพิ่มในรายการ
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <PaginationControls
                    page={currentStockPage}
                    pageSize={STOCK_PAGE_SIZE}
                    totalItems={filteredEquipment.length}
                    onPageChange={setStockPage}
                  />
                </div>
              )}
            </div>
        </section>
      </div>
      {selectedEquipment.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-blue-100 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">รายการที่เลือกไว้</p>
              <p className="truncate text-sm font-semibold text-slate-950">
                {selectedEquipment.length} รายการ
              </p>
            </div>
            <Button asChild className="h-11 gap-2 rounded-xl">
              <Link href={requisitionHref}>
                <ClipboardList className="h-4 w-4" />
                ไปกรอกฟอร์ม
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default function StockOverviewPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_32%,#f1f5f9_100%)] text-slate-950">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
      }
    >
      <StockOverviewContent />
    </React.Suspense>
  )
}
