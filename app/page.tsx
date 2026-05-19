"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ClipboardList,
  Lock,
  Package,
  Search,
  SlidersHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { PaginationControls } from "@/components/PaginationControls"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import type { Equipment } from "@/types"

const LOW_STOCK_THRESHOLD = 10
const STOCK_PAGE_SIZE = 10

type StockFilter = "all" | "available" | "low" | "out"

const stockFilterLabels: Record<StockFilter, string> = {
  all: "ทั้งหมด",
  available: "ยังมีสต๊อก",
  low: "ใกล้หมด",
  out: "หมดสต๊อก",
}

function equipmentMatchesSearch(item: Equipment, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    item.name,
    item.baseUnit,
    item.mainUnit || "",
    String(item.totalStock),
    String(item.used),
    String(item.remaining),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery)
}

function equipmentMatchesFilter(item: Equipment, filter: StockFilter) {
  if (filter === "available") return item.remaining > 0
  if (filter === "low") {
    return item.remaining > 0 && item.remaining <= LOW_STOCK_THRESHOLD
  }
  if (filter === "out") return item.remaining <= 0
  return true
}

function getEquipmentSortNumber(id: string) {
  const match = id.match(/^EQ(\d+)$/i)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function sortEquipmentById(items: Equipment[]) {
  return [...items].sort((a, b) => {
    const numberDiff = getEquipmentSortNumber(a.id) - getEquipmentSortNumber(b.id)
    if (numberDiff !== 0) return numberDiff
    return a.id.localeCompare(b.id)
  })
}

function formatUnit(item: Equipment) {
  return item.mainUnit ? `${item.baseUnit}/${item.mainUnit}` : item.baseUnit
}

function getStockStatus(item: Equipment) {
  if (item.remaining <= 0) {
    return {
      label: "หมดสต๊อก",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    }
  }
  if (item.remaining <= LOW_STOCK_THRESHOLD) {
    return {
      label: "ใกล้หมด",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    }
  }
  return {
    label: "พร้อมเบิก",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  }
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

export default function StockOverviewPage() {
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all")
  const [stockPage, setStockPage] = React.useState(1)
  const { toast } = useToast()

  const fetchEquipment = React.useCallback(async () => {
    try {
      const response = await fetch("/api/equipment?scope=all")
      const data = await response.json()
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

  const lowStockItems = equipment.filter(
    (item) => item.remaining > 0 && item.remaining <= LOW_STOCK_THRESHOLD
  )
  const availableItems = equipment.filter((item) => item.remaining > 0)
  const outOfStockItems = equipment.filter((item) => item.remaining <= 0)
  const filteredEquipment = equipment.filter(
    (item) =>
      equipmentMatchesFilter(item, stockFilter) &&
      equipmentMatchesSearch(item, searchQuery)
  )
  const stockTotalPages = Math.max(
    1,
    Math.ceil(filteredEquipment.length / STOCK_PAGE_SIZE)
  )
  const currentStockPage = Math.min(stockPage, stockTotalPages)
  const paginatedEquipment = filteredEquipment.slice(
    (currentStockPage - 1) * STOCK_PAGE_SIZE,
    currentStockPage * STOCK_PAGE_SIZE
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_32%,#f1f5f9_100%)] text-slate-950">
      <Toaster />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Stock
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                ตรวจสอบสต๊อกอุปกรณ์ทั้งหมด รวมถึงรายการที่คงเหลือหมดแล้ว
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 gap-2 rounded-2xl bg-blue-600 px-5 text-base font-semibold shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-300"
              >
                <Link href="/form">
                  <ClipboardList className="h-4 w-4" />
                  เปิด Request Form
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 gap-2 rounded-2xl border-slate-200 bg-white/95 px-5 text-base font-semibold shadow-md shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Link href="/hr">
                  <Lock className="h-4 w-4" />
                  Management
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-100 bg-white/85 shadow-lg shadow-blue-100/60">
            <CardHeader className="pb-2">
              <CardDescription>อุปกรณ์ทั้งหมด</CardDescription>
              <CardTitle className="text-3xl text-blue-700">
                {loading ? <Skeleton className="h-9 w-20" /> : equipment.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-100 bg-white/85 shadow-lg shadow-emerald-100/60">
            <CardHeader className="pb-2">
              <CardDescription>ยังมีสต๊อก</CardDescription>
              <CardTitle className="text-3xl text-emerald-700">
                {loading ? <Skeleton className="h-9 w-24" /> : availableItems.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-rose-100 bg-white/85 shadow-lg shadow-rose-100/60">
            <CardHeader className="pb-2">
              <CardDescription>หมดสต๊อก</CardDescription>
              <CardTitle className="text-3xl text-rose-700">
                {loading ? <Skeleton className="h-9 w-16" /> : outOfStockItems.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section>
          <Card className="border-white/80 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Package className="h-5 w-5 text-blue-600" />
                    Stock List
                  </CardTitle>
                  <CardDescription>
                    กำลังแสดง: {stockFilterLabels[stockFilter]} · พบ {filteredEquipment.length} รายการ
                  </CardDescription>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_190px] lg:max-w-xl">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="ค้นหาอุปกรณ์..."
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
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[72px] whitespace-nowrap text-center">
                            รูป
                          </TableHead>
                          <TableHead className="min-w-[180px] whitespace-nowrap">
                            อุปกรณ์
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-center">
                            สต๊อกรวม
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-center">
                            ใช้ไป
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-center">
                            คงเหลือ
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-center">สถานะ</TableHead>
                          <TableHead className="whitespace-nowrap text-center">หน่วย</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEquipment.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex justify-center">
                                <EquipmentImage item={item} />
                              </div>
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-center">
                              {item.totalStock}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.used}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {item.remaining}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStockStatus(item).className}`}
                              >
                                {getStockStatus(item).label}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-center">
                              {formatUnit(item)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationControls
                    page={currentStockPage}
                    pageSize={STOCK_PAGE_SIZE}
                    totalItems={filteredEquipment.length}
                    onPageChange={setStockPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

        </section>
      </div>
    </main>
  )
}
