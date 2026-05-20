"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ClipboardList,
  Package,
  Search,
  Settings,
  SlidersHorizontal,
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

export default function StockOverviewPage() {
  const router = useRouter()
  const [showManagement, setShowManagement] = React.useState(false)
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all")
  const [stockPage, setStockPage] = React.useState(1)
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

  React.useEffect(() => {
    setShowManagement(
      new URLSearchParams(window.location.search).get("view") === "management"
    )
  }, [])

  const filteredEquipment = equipment.filter(
    (item) =>
      equipmentMatchesFilter(item, stockFilter) &&
      equipmentMatchesSearch(item, searchQuery)
  )
  const {
    currentPage: currentStockPage,
    items: paginatedEquipment,
  } = paginateItems(filteredEquipment, stockPage, STOCK_PAGE_SIZE)

  if (showManagement) {
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_32%,#f1f5f9_100%)] text-slate-950">
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
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2 lg:flex">
              <Button
                asChild
                className="h-12 w-full gap-2 rounded-2xl bg-blue-600 px-5 text-base font-semibold shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-300"
              >
                <Link href="/form">
                  <ClipboardList className="h-4 w-4" />
                  เปิดฟอร์มเบิก
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
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
                      <SelectItem value="low">ใกล้หมด</SelectItem>
                      <SelectItem value="out">หมดสต๊อก</SelectItem>
                    </SelectContent>
                  </Select>
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
                    {paginatedEquipment.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
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
                      </div>
                    ))}
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
    </main>
  )
}
