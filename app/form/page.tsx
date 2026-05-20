"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Package } from "lucide-react"

import { RequisitionForm } from "@/components/RequisitionForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { apiGet, apiPost } from "@/lib/client-api"
import type { Equipment, RequisitionForm as RequisitionFormType } from "@/types"

type RequisitionResponse = {
  success: boolean
  requisitionNumber: string
}

function getInitialEquipmentIds(value: string | null) {
  if (!value) return []

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

function FormPageContent() {
  const searchParams = useSearchParams()
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [stockError, setStockError] = React.useState("")
  const { toast } = useToast()
  const initialEquipmentIds = React.useMemo(
    () => getInitialEquipmentIds(searchParams.get("equipmentIds")),
    [searchParams]
  )

  const fetchEquipment = React.useCallback(async () => {
    try {
      const data = await apiGet<Equipment[]>("/api/equipment?scope=all")
      setEquipment(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching equipment:", error)
      setEquipment([])
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลอุปกรณ์ได้",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchEquipment()
  }, [fetchEquipment])

  const handleSubmit = async (data: RequisitionFormType) => {
    setSubmitting(true)
    try {
      const result = await apiPost<RequisitionResponse>("/api/requisition", data)

      toast({
        title: "ส่งคำขอเบิกสำเร็จ",
        description: `เลขที่ใบเบิก: ${result.requisitionNumber}`,
      })
      await fetchEquipment()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "ไม่สามารถส่งคำขอเบิกได้"

      if (
        errorMessage.includes("สต๊อก") ||
        errorMessage.includes("ไม่เพียงพอ")
      ) {
        setStockError(errorMessage)
        return
      }

      console.error("Error submitting requisition:", error)
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: errorMessage,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Toaster />
      <Dialog open={Boolean(stockError)} onOpenChange={(open) => !open && setStockError("")}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              สต๊อกไม่เพียงพอ
            </DialogTitle>
            <DialogDescription>
              จำนวนที่ต้องการเบิกมากกว่ายอดคงเหลือในคลัง
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
            {stockError}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setStockError("")} className="w-full sm:w-auto">
              ตกลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5 text-blue-600" />
                  ฟอร์มเบิกอุปกรณ์
                </CardTitle>
                <CardDescription className="mt-1">
                  กรอกข้อมูลผู้เบิกและเลือกรายการอุปกรณ์ที่ต้องการเบิก
                </CardDescription>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl sm:w-auto"
              >
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  กลับหน้าคลัง
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <RequisitionForm
                equipment={equipment}
                initialEquipmentIds={initialEquipmentIds}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function FormPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="mt-2 h-4 w-full max-w-md" />
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      }
    >
      <FormPageContent />
    </React.Suspense>
  )
}
