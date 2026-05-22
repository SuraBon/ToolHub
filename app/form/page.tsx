"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Package } from "lucide-react"

import { BackToStockButton } from "@/components/BackToStockButton"
import { MobileActionButton } from "@/components/MobileActionButton"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { apiGet, apiPost } from "@/lib/client-api"
import { getErrorMessage, showApiErrorToast } from "@/lib/show-api-error-toast"
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
      showApiErrorToast({
        toast,
        error,
        fallback: "ไม่สามารถดึงข้อมูลคลังอุปกรณ์ได้",
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
        title: "ส่งคำขอเบิกอุปกรณ์สำเร็จ",
        description: `เลขที่ใบเบิก: ${result.requisitionNumber}`,
      })
      await fetchEquipment()
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "ไม่สามารถส่งคำขอเบิกอุปกรณ์ได้"
      )

      if (
        errorMessage.includes("สต๊อก") ||
        errorMessage.includes("ไม่เพียงพอ")
      ) {
        setStockError(errorMessage)
        return
      }

      console.error("Error submitting requisition:", error)
      showApiErrorToast({
        toast,
        error,
        fallback: "ไม่สามารถส่งคำขอเบิกอุปกรณ์ได้",
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
              จำนวนคงเหลือไม่เพียงพอ
            </DialogTitle>
            <DialogDescription>
              จำนวนที่ต้องการเบิกมากกว่าจำนวนคงเหลือในคลังอุปกรณ์
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
            {stockError}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <MobileActionButton
              type="button"
              onClick={() => setStockError("")}
              className="w-full sm:w-auto"
            >
              ตกลง
            </MobileActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Package className="h-5 w-5 text-blue-600" />
                  ฟอร์มเบิกอุปกรณ์
                </CardTitle>
                <CardDescription className="mt-1">
                  กรอกข้อมูลผู้เบิกและเลือกรายการอุปกรณ์ที่ต้องการเบิก
                </CardDescription>
              </div>
              <BackToStockButton className="h-10 w-full gap-2 rounded-xl sm:w-auto" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-5 sm:p-6 sm:pt-5">
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
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
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
