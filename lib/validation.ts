import { z } from "zod"

const positiveFiniteNumber = z.coerce
  .number({
    invalid_type_error: "จำนวนต้องเป็นตัวเลข",
  })
  .finite("จำนวนต้องเป็นตัวเลข")
  .positive("จำนวนต้องมากกว่า 0")

const nonNegativeFiniteNumber = z.coerce
  .number({
    invalid_type_error: "จำนวนต้องเป็นตัวเลข",
  })
  .finite("จำนวนต้องเป็นตัวเลข")
  .min(0, "จำนวนต้องไม่ติดลบ")

const optionalRatio = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite("อัตราส่วนต้องเป็นตัวเลข").positive("อัตราส่วนต้องมากกว่า 0").optional()
)

export const RequisitionPayloadSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  department: z.string().trim().min(1, "กรุณากรอกแผนก"),
  items: z
    .array(
      z.object({
        equipmentId: z.string().trim().min(1, "กรุณาเลือกอุปกรณ์"),
        equipmentName: z.string().optional(),
        equipmentImage: z.string().optional(),
        amount: positiveFiniteNumber,
        isMainUnit: z.boolean().default(false),
      })
    )
    .min(1, "กรุณาเพิ่มรายการอุปกรณ์อย่างน้อย 1 รายการ"),
})

export type RequisitionPayload = z.infer<typeof RequisitionPayloadSchema>

export const EquipmentPayloadSchema = z
  .object({
    id: z.string().trim().optional(),
    image: z.string().trim().optional(),
    name: z.string().trim().min(1, "กรุณาระบุชื่ออุปกรณ์"),
    totalStock: nonNegativeFiniteNumber,
    used: nonNegativeFiniteNumber.default(0),
    baseUnit: z.string().trim().min(1, "กรุณาระบุหน่วยย่อย"),
    mainUnit: z.string().trim().optional(),
    ratio: optionalRatio,
  })
  .passthrough()
  .superRefine((equipment, context) => {
    if (equipment.used > equipment.totalStock) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "จำนวนที่ใช้ไปต้องไม่มากกว่าสต๊อกรวม",
        path: ["used"],
      })
    }

    if (equipment.mainUnit && !equipment.ratio) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "กรุณาระบุอัตราส่วนมากกว่า 0 เมื่อมีหน่วยใหญ่",
        path: ["ratio"],
      })
    }
  })

export type EquipmentPayload = z.infer<typeof EquipmentPayloadSchema>

export function validateRequisitionPayload(input: unknown) {
  return RequisitionPayloadSchema.parse(input)
}

export function validateEquipmentPayload(input: unknown) {
  return EquipmentPayloadSchema.parse(input)
}
