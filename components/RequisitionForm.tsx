"use client"

import * as React from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Package, Plus, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"

import { EquipmentCombobox } from "@/components/EquipmentCombobox"
import { UnitSelector } from "@/components/UnitSelector"
import { Button } from "@/components/ui/button"
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
import { RequisitionFormSchema } from "@/types"
import type {
  Equipment,
  RequisitionForm as RequisitionFormValues,
} from "@/types"

interface RequisitionFormProps {
  equipment: Equipment[]
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
  onSubmit,
  isSubmitting = false,
}: RequisitionFormProps) {
  const { toast } = useToast()
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

  const { fields, append, remove } = useFieldArray({
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
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการเบิกได้ กรุณาลองใหม่",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
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
          </motion.div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">รายการอุปกรณ์</h3>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    equipmentId: "",
                    equipmentName: "",
                    equipmentImage: "",
                    amount: 1,
                    isMainUnit: false,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มรายการ
              </Button>
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
                  initial={{ opacity: 0, y: 20 }}
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
                      className="shrink-0"
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
                                  <Input
                                    type="number"
                                    min="1"
                                    {...field}
                                    onChange={(event) =>
                                      field.onChange(
                                        parseInt(event.target.value) || 0
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
                                  <UnitSelector
                                    equipment={selectedEquipment}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="shrink-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเบิก"}
          </Button>
        </motion.div>
      </form>
    </Form>
  )
}
