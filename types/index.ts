import { z } from 'zod'

export const EquipmentSchema = z.object({
  id: z.string(),
  image: z.string().optional(),
  name: z.string(),
  totalStock: z.number(),
  used: z.number(),
  remaining: z.number(),
  baseUnit: z.string(),
  mainUnit: z.string().optional(),
  ratio: z.number().optional(),
})

export type Equipment = z.infer<typeof EquipmentSchema>

const RequisitionItemSchema = z.object({
  equipmentId: z.string(),
  equipmentName: z.string(),
  equipmentImage: z.string().optional(),
  amount: z.number().min(1, 'จำนวนต้องมากกว่า 0'),
  isMainUnit: z.boolean().default(false),
})

export const RequisitionFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  department: z.string().min(1, 'กรุณากรอกแผนก'),
  items: z.array(RequisitionItemSchema).min(1, 'กรุณาเพิ่มรายการอุปกรณ์อย่างน้อย 1 รายการ'),
})

export type RequisitionForm = z.infer<typeof RequisitionFormSchema>
