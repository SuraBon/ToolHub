"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EquipmentCombobox } from "@/components/EquipmentCombobox"
import { QuantityStepper } from "@/components/QuantityStepper"
import { UnitSelector } from "@/components/UnitSelector"
import type { Equipment } from "@/types"
import type { RequisitionHistory } from "./HistoryTable"

const historyEditSchema = z.object({
  requisitionNumber: z.string(),
  date: z.string().min(1, "กรุณากรอกวันที่เบิก"),
  name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  department: z.string().min(1, "กรุณากรอกแผนก"),
  equipmentId: z.string().min(1, "กรุณาเลือกอุปกรณ์"),
  amount: z
    .string()
    .refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 1
    }, "จำนวนต้องไม่ต่ำกว่า 1"),
  isMainUnit: z.boolean(),
})

type HistoryEditFormValues = z.infer<typeof historyEditSchema>

interface HistoryEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingHistoryItem: RequisitionHistory | null
  equipment: Equipment[]
  onSave: (payload: any) => Promise<void>
  saving: boolean
}

export function HistoryEditDialog({
  open,
  onOpenChange,
  editingHistoryItem,
  equipment,
  onSave,
  saving,
}: HistoryEditDialogProps) {
  const equipmentOptions = React.useMemo(() => {
    if (!editingHistoryItem) return equipment

    const hasMatch = equipment.some(
      (eq) =>
        (editingHistoryItem.equipmentId &&
          eq.id.trim().toLowerCase() === editingHistoryItem.equipmentId.trim().toLowerCase()) ||
        eq.name.trim().toLowerCase() === editingHistoryItem.equipmentName.trim().toLowerCase()
    )

    if (hasMatch) return equipment

    // If not found in active equipment list, inject virtual equipment for deleted items
    const virtualEquipment: Equipment = {
      id: editingHistoryItem.equipmentId || `deleted-${Date.now()}`,
      name: `${editingHistoryItem.equipmentName} (ไม่มีในคลัง)`,
      image: "",
      totalStock: 0,
      used: 0,
      remaining: 0,
      baseUnit: editingHistoryItem.unit,
      mainUnit: undefined,
      ratio: undefined,
    }

    return [...equipment, virtualEquipment]
  }, [equipment, editingHistoryItem])

  const getInitialValues = React.useCallback(
    (item: RequisitionHistory | null): HistoryEditFormValues => {
      if (!item) {
        return {
          requisitionNumber: "",
          date: "",
          name: "",
          department: "",
          equipmentId: "",
          amount: "1",
          isMainUnit: false,
        }
      }

      const matchedEquipment =
        equipmentOptions.find(
          (eq) =>
            item.equipmentId &&
            eq.id.trim().toLowerCase() === item.equipmentId.trim().toLowerCase()
        ) ||
        equipmentOptions.find(
          (eq) =>
            eq.name.trim().toLowerCase() === item.equipmentName.trim().toLowerCase()
        )

      return {
        requisitionNumber: item.requisitionNumber,
        date: item.date,
        name: item.name,
        department: item.department,
        equipmentId: matchedEquipment?.id || "",
        amount: String(item.amount),
        isMainUnit: Boolean(
          matchedEquipment?.mainUnit &&
            item.unit.trim().toLowerCase() === matchedEquipment.mainUnit.trim().toLowerCase()
        ),
      }
    },
    [equipmentOptions]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HistoryEditFormValues>({
    resolver: zodResolver(historyEditSchema),
    defaultValues: getInitialValues(editingHistoryItem),
  })

  React.useEffect(() => {
    if (open) {
      reset(getInitialValues(editingHistoryItem))
    }
  }, [open, editingHistoryItem, reset, getInitialValues])

  const equipmentId = watch("equipmentId")
  const isMainUnit = watch("isMainUnit")
  const amountStr = watch("amount")

  const selectedHistoryEquipment = React.useMemo(() => {
    return equipmentOptions.find((item) => item.id === equipmentId) || null
  }, [equipmentOptions, equipmentId])

  const handleEquipmentSelect = (id: string) => {
    const nextEquipment = equipmentOptions.find((item) => item.id === id)
    setValue("equipmentId", id)
    setValue(
      "isMainUnit",
      isMainUnit && Boolean(nextEquipment?.mainUnit && nextEquipment.ratio)
    )
  }

  const onSubmit = async (values: HistoryEditFormValues) => {
    if (saving || !editingHistoryItem) return
    const payload = {
      rowNumber: editingHistoryItem.rowNumber,
      requisitionNumber: values.requisitionNumber,
      date: values.date,
      name: values.name,
      department: values.department,
      equipmentId: values.equipmentId,
      amount: Number(values.amount),
      isMainUnit: values.isMainUnit,
    }
    await onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>แก้ไขประวัติการเบิกอุปกรณ์</DialogTitle>
          <DialogDescription>
            แก้ไขรายการที่เบิกผิด ระบบจะปรับจำนวนที่เบิกไปแล้วและยอดคงเหลือให้ตามข้อมูลใหม่
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>เลขที่ใบเบิก</Label>
              <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                {editingHistoryItem?.requisitionNumber}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="historyDate">วันที่เบิก</Label>
              <Input id="historyDate" {...register("date")} />
              {errors.date && (
                <p className="text-xs font-semibold text-red-600">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="historyName">ชื่อ-นามสกุล</Label>
              <Input id="historyName" {...register("name")} />
              {errors.name && (
                <p className="text-xs font-semibold text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="historyDepartment">แผนก</Label>
              <Input id="historyDepartment" {...register("department")} />
              {errors.department && (
                <p className="text-xs font-semibold text-red-600">{errors.department.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>อุปกรณ์</Label>
              <EquipmentCombobox
                equipment={equipmentOptions}
                value={equipmentId}
                onSelect={handleEquipmentSelect}
                disableUnavailable={false}
              />
              {errors.equipmentId && (
                <p className="text-xs font-semibold text-red-600">{errors.equipmentId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="historyAmount">จำนวน</Label>
              <QuantityStepper
                id="historyAmount"
                min={1}
                value={amountStr || "1"}
                onValueChange={(val) => setValue("amount", val)}
              />
              {errors.amount && (
                <p className="text-xs font-semibold text-red-600">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>หน่วย</Label>
              <UnitSelector
                equipment={selectedHistoryEquipment}
                value={isMainUnit}
                onValueChange={(val) => setValue("isMainUnit", val)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "กำลังบันทึก..." : "บันทึกประวัติการเบิก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
