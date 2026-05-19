"use client"

import * as React from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Package } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

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
import { EquipmentCombobox } from "@/components/EquipmentCombobox"
import { UnitSelector } from "@/components/UnitSelector"
import { RequisitionFormSchema } from "@/types"
import type { Equipment, RequisitionForm as RequisitionFormValues } from "@/types"
import { useToast } from "@/components/ui/use-toast"

interface RequisitionFormProps {
  equipment: Equipment[]
  onSubmit: (data: RequisitionFormValues) => Promise<void>
  isSubmitting?: boolean
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
      items: [{ equipmentId: "", equipmentName: "", equipmentImage: "", amount: 1, isMainUnit: false }],
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
    if (selectedEquipment) {
      form.setValue(`items.${index}.equipmentId`, equipmentId)
      form.setValue(`items.${index}.equipmentName`, selectedEquipment.name)
      form.setValue(`items.${index}.equipmentImage`, selectedEquipment.image || "")
      form.setValue(`items.${index}.isMainUnit`, false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Plus className="h-4 w-4 mr-2" />
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
                  className="border rounded-xl p-4 space-y-4 bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex-shrink-0"
                    >
                      {selectedEquipment?.image ? (
                        <Image
                          src={selectedEquipment.image}
                          alt={selectedEquipment.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-lg object-cover shadow-sm"
                          unoptimized
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                    </motion.div>
                    <div className="flex-1 space-y-4">
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
                          className="grid grid-cols-2 gap-4"
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
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0
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
                          className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
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
          <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเบิก"}
          </Button>
        </motion.div>
      </form>
    </Form>
  )
}
