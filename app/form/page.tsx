"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"

import { RequisitionForm } from "@/components/RequisitionForm"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import type { Equipment, RequisitionForm as RequisitionFormType } from "@/types"

export default function FormPage() {
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
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
      const response = await fetch("/api/requisition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "บันทึกสำเร็จ",
          description: `เลขที่ใบเบิก: ${result.requisitionNumber}`,
        })
        await fetchEquipment()
      } else {
        toast({
          variant: "destructive",
          title: "เกิดข้อผิดพลาด",
          description: result.error || "ไม่สามารถบันทึกการเบิกได้",
        })
      }
    } catch (error) {
      console.error("Error submitting requisition:", error)
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการเบิกได้",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Toaster />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              แบบฟอร์มเบิกอุปกรณ์
            </h1>
          </div>
          <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              กลับภาพรวมสต๊อก
            </Link>
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-blue-600" />
              รายละเอียดการเบิก
            </CardTitle>
            <CardDescription>
              กรอกข้อมูลผู้เบิกและเลือกรายการอุปกรณ์ที่ต้องการ
            </CardDescription>
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
