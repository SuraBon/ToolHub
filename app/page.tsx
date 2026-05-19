"use client"

import * as React from "react"
import { Package } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RequisitionForm } from "@/components/RequisitionForm"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { Equipment } from "@/types"
import { RequisitionForm as RequisitionFormType } from "@/types"

export default function Home() {
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
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
  }

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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              ระบบเบิกอุปกรณ์
            </h1>
            <p className="text-gray-600">
              Equipment Requisition System
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                แบบฟอร์มเบิกอุปกรณ์
              </CardTitle>
              <CardDescription>
                กรอกข้อมูลเพื่อทำรายการเบิกอุปกรณ์
              </CardDescription>
            </CardHeader>
            <CardContent>
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

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>ติดต่อ HR หากต้องการความช่วยเหลือ</p>
          </div>
        </div>
      </div>
    </main>
  )
}
