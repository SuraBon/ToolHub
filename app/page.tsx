"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Lock, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export default function StockOverviewPage() {
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const { toast } = useToast()

  const fetchEquipment = React.useCallback(async () => {
    try {
      const response = await fetch("/api/equipment")
      const data = await response.json()
      setEquipment(Array.isArray(data) ? data : [])
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

  const totalRemaining = equipment.reduce((sum, item) => sum + item.remaining, 0)
  const lowStockItems = equipment.filter(
    (item) => item.remaining <= LOW_STOCK_THRESHOLD
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_32%,#f1f5f9_100%)] text-slate-950">
      <Toaster />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ภาพรวมสต๊อกอุปกรณ์
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              ตรวจสอบภาพรวมอุปกรณ์ที่พร้อมเบิก แล้วเข้าแบบฟอร์มเพื่อทำรายการ
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="gap-2">
              <Link href="/form">
                ไปที่แบบฟอร์มเบิกอุปกรณ์
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/hr">
                <Lock className="h-4 w-4" />
                จัดการสต๊อก HR
              </Link>
            </Button>
          </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-100 bg-white/85 shadow-lg shadow-blue-100/60">
            <CardHeader className="pb-2">
              <CardDescription>รายการที่เบิกได้</CardDescription>
              <CardTitle className="text-3xl text-blue-700">
                {loading ? <Skeleton className="h-9 w-20" /> : equipment.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-100 bg-white/85 shadow-lg shadow-emerald-100/60">
            <CardHeader className="pb-2">
              <CardDescription>คงเหลือรวม</CardDescription>
              <CardTitle className="text-3xl text-emerald-700">
                {loading ? <Skeleton className="h-9 w-24" /> : totalRemaining}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-100 bg-white/85 shadow-lg shadow-amber-100/60">
            <CardHeader className="pb-2">
              <CardDescription>รายการใกล้หมด</CardDescription>
              <CardTitle className="text-3xl text-amber-700">
                {loading ? <Skeleton className="h-9 w-16" /> : lowStockItems.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="border-white/80 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="h-5 w-5 text-blue-600" />
                สต๊อกที่พร้อมเบิก
              </CardTitle>
              <CardDescription>
                แสดงเฉพาะรายการที่ยังมีคงเหลือมากกว่า 0
              </CardDescription>
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
                  ยังไม่มีอุปกรณ์ที่พร้อมเบิก
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">อุปกรณ์</TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          คงเหลือ
                        </TableHead>
                        <TableHead className="whitespace-nowrap">หน่วย</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.remaining}
                          </TableCell>
                          <TableCell>{item.baseUnit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                ใกล้หมด
              </CardTitle>
              <CardDescription>
                รายการที่เหลือไม่เกิน {LOW_STOCK_THRESHOLD} หน่วย
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                  ยังไม่มีรายการใกล้หมด
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          เหลือน้อยกว่าที่กำหนด
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-amber-800">
                        {item.remaining} {item.baseUnit}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
