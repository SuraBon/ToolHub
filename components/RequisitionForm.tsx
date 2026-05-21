"use client"

import * as React from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Package, Plus, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"

import { EquipmentCombobox } from "@/components/EquipmentCombobox"
import { MobileActionButton } from "@/components/MobileActionButton"
import { QuantityStepper } from "@/components/QuantityStepper"
import { UnitSelector } from "@/components/UnitSelector"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { showApiErrorToast } from "@/lib/show-api-error-toast"
import { RequisitionFormSchema } from "@/types"
import type {
  Equipment,
  RequisitionForm as RequisitionFormValues,
} from "@/types"

interface RequisitionFormProps {
  equipment: Equipment[]
  initialEquipmentIds?: string[]
  onSubmit: (data: RequisitionFormValues) => Promise<void>
  isSubmitting?: boolean
}

function SelectedEquipmentImage({
  equipment,
}: {
  equipment: Equipment | undefined
}) {
  if (equipment?.image) {
    return (
      <Image
        src={equipment.image}
        alt={equipment.name}
        width={72}
        height={72}
        className="h-16 w-16 rounded-xl object-cover shadow-sm sm:h-20 sm:w-20"
        unoptimized
      />
    )
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 sm:h-20 sm:w-20">
      <Package className="h-8 w-8 text-blue-600" />
    </div>
  )
}

export function RequisitionForm({
  equipment,
  initialEquipmentIds = [],
  onSubmit,
  isSubmitting = false,
}: RequisitionFormProps) {
  const { toast } = useToast()
  const appliedInitialEquipmentRef = React.useRef(false)
  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(RequisitionFormSchema),
    defaultValues: {
      name: "",
      department: "",
      items: [
        {
          equipmentId: "",
          equipmentName: "",
          equipmentImage: "",
          amount: 1,
          isMainUnit: false,
        },
      ],
    },
  })

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const items = useWatch({
    control: form.control,
    name: "items",
  })

  const handleSubmit = async (data: RequisitionFormValues) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      showApiErrorToast({
        toast,
        error,
        fallback: "ไม่สามารถส่งคำขอเบิกอุปกรณ์ได้ กรุณาตรวจสอบข้อมูลและลองอีกครั้ง",
      })
    }
  }

  const handleEquipmentSelect = (index: number, equipmentId: string) => {
    const selectedEquipment = equipment.find((eq) => eq.id === equipmentId)

    if (!selectedEquipment) {
      form.setValue(`items.${index}.equipmentId`, "")
      form.setValue(`items.${index}.equipmentName`, "")
      form.setValue(`items.${index}.equipmentImage`, "")
      form.setValue(`items.${index}.isMainUnit`, false)
      return
    }

    form.setValue(`items.${index}.equipmentId`, selectedEquipment.id)
    form.setValue(`items.${index}.equipmentName`, selectedEquipment.name)
    form.setValue(`items.${index}.equipmentImage`, selectedEquipment.image || "")
    form.setValue(`items.${index}.isMainUnit`, false)
  }

  React.useEffect(() => {
    if (appliedInitialEquipmentRef.current || initialEquipmentIds.length === 0) {
      return
    }

    appliedInitialEquipmentRef.current = true

    const uniqueIds = Array.from(new Set(initialEquipmentIds))
    const validEquipment = uniqueIds
      .map((equipmentId) => equipment.find((item) => item.id === equipmentId))
      .filter(
        (item): item is Equipment => Boolean(item && item.remaining > 0)
      )

    if (validEquipment.length === 0) {
      toast({
        variant: "destructive",
        title: "ไม่พบรายการที่พร้อมเบิก",
        description: "ระบบข้ามรายการที่ไม่พร้อมให้เบิกโดยอัตโนมัติ",
      })
      return
    }

    if (validEquipment.length < uniqueIds.length) {
      toast({
        title: "ตรวจพบรายการที่ไม่พร้อมเบิก",
        description: "ระบบข้ามรายการที่ไม่พร้อมให้เบิกโดยอัตโนมัติ",
      })
    }

    const currentValues = form.getValues()
    form.reset({
      ...currentValues,
      items: validEquipment.map((item) => ({
        equipmentId: item.id,
        equipmentName: item.name,
        equipmentImage: item.image || "",
        amount: 1,
        isMainUnit: false,
      })),
    })
  }, [equipment, form, initialEquipmentIds, toast])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อ-นามสกุล</FormLabel>
                  <FormControl>
                    <Input placeholder="กรอกชื่อ-นามสกุล" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>แผนก</FormLabel>
                  <FormControl>
                    <Input placeholder="กรอกแผนก" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">รายการอุปกรณ์</h3>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <MobileActionButton
                type="button"
                variant="outline"
                size="sm"
                className="h-11 w-full gap-2 rounded-xl sm:w-auto"
                onClick={() =>
                  prepend({
                    equipmentId: "",
                    equipmentName: "",
                    equipmentImage: "",
                    amount: 1,
                    isMainUnit: false,
                  })
                }
              >
                <Plus className="h-4 w-4" />
                เพิ่มรายการอุปกรณ์
              </MobileActionButton>
            </motion.div>
          </div>

          <AnimatePresence mode="popLayout">
            {fields.map((field, index) => {
              const item = items[index]
              const selectedEquipment = equipment.find(
                (eq) => eq.id === item?.equipmentId
              )

              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex shrink-0 justify-center"
                    >
                      <SelectedEquipmentImage equipment={selectedEquipment} />
                    </motion.div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.equipmentId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>อุปกรณ์</FormLabel>
                            <FormControl>
                              <EquipmentCombobox
                                equipment={equipment}
                                value={field.value}
                                onSelect={(value) =>
                                  handleEquipmentSelect(index, value)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedEquipment && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                        >
                          <FormField
                            control={form.control}
                            name={`items.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>จำนวน</FormLabel>
                                <FormControl>
                                  <QuantityStepper
                                    id={`items.${index}.amount`}
                                    min={1}
                                    value={field.value}
                                    onValueChange={(value) =>
                                      field.onChange(
                                        value === "" ? "" : Number(value)
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.isMainUnit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>หน่วย</FormLabel>
                                <FormControl>
                                  <div className="space-y-1.5">
                                    <UnitSelector
                                      equipment={selectedEquipment}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    />
                                    {selectedEquipment.mainUnit && selectedEquipment.ratio && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                                        <span>
                                          1 {selectedEquipment.mainUnit} ={" "}
                                          {selectedEquipment.ratio}{" "}
                                          {selectedEquipment.baseUnit}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="self-end sm:self-start"
                      >
                        <MobileActionButton
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-11 w-11 shrink-0 rounded-xl hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </MobileActionButton>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MobileActionButton
            type="submit"
            className="h-12 w-full text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? "กำลังส่งคำขอ..." : "ส่งคำขอเบิกอุปกรณ์"}
          </MobileActionButton>
        </motion.div>
      </form>
    </Form>
  )
}
