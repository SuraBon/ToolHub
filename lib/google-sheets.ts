import { google } from "googleapis"

import { Equipment } from "@/types"

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
const STOCK_SHEET_NAME = "สต๊อกอุปกรณ์"
const HISTORY_SHEET_NAME = "ประวัติการเบิก"

type EquipmentInput = Omit<
  Partial<Equipment>,
  "totalStock" | "used" | "remaining" | "ratio"
> & {
  totalStock?: number | string
  used?: number | string
  remaining?: number | string
  ratio?: number | string
}

export async function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    SCOPES
  )

  await auth.authorize()
  return google.sheets({ version: "v4", auth })
}

function toNumber(value: unknown, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function mapEquipmentRow(row: string[], index: number): Equipment {
  return {
    id: row[0] || `EQ${String(index + 1).padStart(3, "0")}`,
    image: row[1] || "",
    name: row[2] || "",
    totalStock: toNumber(row[3]),
    used: toNumber(row[4]),
    remaining: toNumber(row[5]),
    baseUnit: row[6] || "",
    mainUnit: row[7] || "",
    ratio: row[8] ? toNumber(row[8]) : undefined,
  }
}

function equipmentToRow(equipment: Equipment) {
  return [
    equipment.id,
    equipment.image || "",
    equipment.name,
    equipment.totalStock,
    equipment.used,
    equipment.remaining,
    equipment.baseUnit,
    equipment.mainUnit || "",
    equipment.ratio || "",
  ]
}

export function normalizeEquipmentInput(
  input: EquipmentInput,
  fallbackId?: string
): Equipment {
  const id = String(input.id || fallbackId || "").trim()
  const image = String(input.image || "").trim()
  const name = String(input.name || "").trim()
  const baseUnit = String(input.baseUnit || "").trim()
  const mainUnit = String(input.mainUnit || "").trim()
  const totalStock = toNumber(input.totalStock)
  const used = toNumber(input.used)
  const ratioValue = input.ratio === "" ? undefined : input.ratio
  const ratio = ratioValue === undefined ? undefined : toNumber(ratioValue)

  return {
    id,
    image,
    name,
    totalStock,
    used,
    remaining: totalStock - used,
    baseUnit,
    mainUnit,
    ratio: ratio && ratio > 0 ? ratio : undefined,
  }
}

export function validateEquipmentInput(equipment: Equipment) {
  if (!equipment.id) return "กรุณาระบุรหัสอุปกรณ์"
  if (!equipment.name) return "กรุณาระบุชื่ออุปกรณ์"
  if (!equipment.baseUnit) return "กรุณาระบุหน่วยย่อย"
  if (equipment.totalStock < 0) return "สต๊อกรวมต้องไม่ติดลบ"
  if (equipment.used < 0) return "จำนวนที่ใช้ไปต้องไม่ติดลบ"
  if (equipment.used > equipment.totalStock) {
    return "จำนวนที่ใช้ไปต้องไม่มากกว่าสต๊อกรวม"
  }
  if (equipment.mainUnit && (!equipment.ratio || equipment.ratio <= 0)) {
    return "กรุณาระบุอัตราส่วนมากกว่า 0 เมื่อมีหน่วยใหญ่"
  }

  return null
}

export async function getAllEquipmentData() {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${STOCK_SHEET_NAME}!A2:I`,
  })

  const rows = response.data.values || []
  return rows.map((row, index) => mapEquipmentRow(row as string[], index))
}

export async function getAvailableEquipmentData() {
  const equipment = await getAllEquipmentData()
  return equipment.filter((item) => item.remaining > 0)
}

export async function getEquipmentData() {
  return getAllEquipmentData()
}

export function generateNextEquipmentId(equipment: Equipment[]) {
  const maxNumber = equipment.reduce((max, item) => {
    const match = item.id.match(/^EQ(\d+)$/i)
    if (!match) return max
    return Math.max(max, Number(match[1]))
  }, 0)

  return `EQ${String(maxNumber + 1).padStart(3, "0")}`
}

export async function appendEquipment(input: EquipmentInput) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID
  const existingEquipment = await getAllEquipmentData()
  const fallbackId = generateNextEquipmentId(existingEquipment)
  const equipment = normalizeEquipmentInput(input, fallbackId)
  const validationError = validateEquipmentInput(equipment)

  if (validationError) {
    throw new Error(validationError)
  }

  if (existingEquipment.some((item) => item.id === equipment.id)) {
    throw new Error("รหัสอุปกรณ์นี้มีอยู่แล้ว")
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${STOCK_SHEET_NAME}!A:I`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [equipmentToRow(equipment)],
    },
  })

  return equipment
}

export async function updateEquipment(equipmentId: string, input: EquipmentInput) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID
  const existingEquipment = await getAllEquipmentData()
  const rowIndex = existingEquipment.findIndex((item) => item.id === equipmentId)

  if (rowIndex === -1) {
    throw new Error("ไม่พบอุปกรณ์ที่ต้องการแก้ไข")
  }

  const equipment = normalizeEquipmentInput(
    { ...input, id: equipmentId },
    equipmentId
  )
  const validationError = validateEquipmentInput(equipment)

  if (validationError) {
    throw new Error(validationError)
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${STOCK_SHEET_NAME}!A${rowIndex + 2}:I${rowIndex + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [equipmentToRow(equipment)],
    },
  })

  return equipment
}

export async function appendRequisition(data: unknown[][]) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${HISTORY_SHEET_NAME}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: data,
    },
  })
}

export async function updateStock(updates: Array<{ range: string; values: unknown[][] }>) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates.map((update) => ({
        range: update.range,
        values: update.values,
      })),
    },
  })
}

export async function autoFillSampleData() {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID

  const stockResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${STOCK_SHEET_NAME}!A2:I2`,
  })

  if (stockResponse.data.values && stockResponse.data.values.length > 0) {
    return
  }

  const sampleEquipment = [
    ["EQ001", "", "กระดาษ A4", 5000, 0, 5000, "แผ่น", "รีม", 500],
    ["EQ002", "", "ปากกาลูกลื่น", 1000, 0, 1000, "แท่ง", "กล่อง", 12],
    ["EQ003", "", "ไม้บรรทัด", 200, 0, 200, "เส้น", "แพ็ค", 10],
    ["EQ004", "", "สมุดจดบันทึก", 500, 0, 500, "เล่ม", "แพ็ค", 10],
    ["EQ005", "", "กล่องไฟล์", 300, 0, 300, "กล่อง", "แพ็ค", 10],
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${STOCK_SHEET_NAME}!A2:I`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: sampleEquipment,
    },
  })
}
