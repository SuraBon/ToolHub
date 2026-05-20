import { google } from "googleapis"

import {
  HISTORY_HEADERS,
  HISTORY_SHEET_NAME,
  STOCK_HEADERS,
  STOCK_SHEET_NAME,
  headerRange,
  historyAppendRange,
  historyReadRange,
  historyRowRange,
  stockAppendRange,
  stockReadRange,
  stockRowRange,
  stockUsageRange,
} from "@/lib/google-sheets-ranges"
import { requireEnv } from "@/lib/env"
import { toBaseUnit } from "@/lib/unit-conversion"
import { Equipment } from "@/types"
import type { RequisitionHistoryPayload } from "@/lib/validation"

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

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
    requireEnv("GOOGLE_CLIENT_EMAIL"),
    undefined,
    requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    SCOPES
  )

  await auth.authorize()
  return google.sheets({ version: "v4", auth })
}

async function ensureSheetExists(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  spreadsheetId: string | undefined,
  sheetName: string,
  headers: string[]
) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  })
  const existingSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetName
  )

  if (!existingSheet) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (!message.includes("already exists")) {
        throw error
      }
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange(sheetName, headers.length),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers],
    },
  })
}

export async function ensureWorkbookSetup() {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  await Promise.all([
    ensureSheetExists(sheets, spreadsheetId, STOCK_SHEET_NAME, STOCK_HEADERS),
    ensureSheetExists(sheets, spreadsheetId, HISTORY_SHEET_NAME, HISTORY_HEADERS),
  ])
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

function normalizeEquipmentInput(
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

function validateEquipmentInput(equipment: Equipment) {
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
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  await ensureSheetExists(sheets, spreadsheetId, STOCK_SHEET_NAME, STOCK_HEADERS)

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: stockReadRange(),
  })

  const rows = response.data.values || []
  return rows.map((row, index) => mapEquipmentRow(row as string[], index))
}

export async function getRequisitionHistoryData() {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  await ensureSheetExists(
    sheets,
    spreadsheetId,
    HISTORY_SHEET_NAME,
    HISTORY_HEADERS
  )

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: historyReadRange(),
  })

  const rows = response.data.values || []

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    requisitionNumber: row[0] || "",
    date: row[1] || "",
    name: row[2] || "",
    department: row[3] || "",
    equipmentName: row[4] || "",
    amount: toNumber(row[5]),
    unit: row[6] || "",
  }))
}

export async function getAvailableEquipmentData() {
  const equipment = await getAllEquipmentData()
  return equipment.filter((item) => item.remaining > 0)
}

export async function getEquipmentData() {
  return getAllEquipmentData()
}

function generateNextEquipmentId(equipment: Equipment[]) {
  const maxNumber = equipment.reduce((max, item) => {
    const match = item.id.match(/^EQ(\d+)$/i)
    if (!match) return max
    return Math.max(max, Number(match[1]))
  }, 0)

  return `EQ${String(maxNumber + 1).padStart(3, "0")}`
}

export async function appendEquipment(input: EquipmentInput) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const existingEquipment = await getAllEquipmentData()
  const fallbackId = generateNextEquipmentId(existingEquipment)
  const equipment = normalizeEquipmentInput({ ...input, id: "" }, fallbackId)
  const validationError = validateEquipmentInput(equipment)

  if (validationError) {
    throw new Error(validationError)
  }

  if (existingEquipment.some((item) => item.id === equipment.id)) {
    throw new Error("รหัสอุปกรณ์นี้มีอยู่แล้ว")
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: stockAppendRange(),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [equipmentToRow(equipment)],
    },
  })

  return equipment
}

export async function updateEquipment(equipmentId: string, input: EquipmentInput) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
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
    range: stockRowRange(rowIndex + 2),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [equipmentToRow(equipment)],
    },
  })

  return equipment
}

export async function deleteEquipment(equipmentId: string) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const existingEquipment = await getAllEquipmentData()
  const rowIndex = existingEquipment.findIndex((item) => item.id === equipmentId)

  if (rowIndex === -1) {
    throw new Error("ไม่พบอุปกรณ์ที่ต้องการลบ")
  }
  const deletedEquipment = existingEquipment[rowIndex]

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  })
  const stockSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === STOCK_SHEET_NAME
  )
  const sheetId = stockSheet?.properties?.sheetId

  if (sheetId === undefined || sheetId === null) {
    throw new Error("ไม่พบชีตสต๊อกอุปกรณ์")
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    },
  })

  return deletedEquipment
}

export async function appendRequisition(data: unknown[][]) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  await ensureSheetExists(
    sheets,
    spreadsheetId,
    HISTORY_SHEET_NAME,
    HISTORY_HEADERS
  )

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: historyAppendRange(),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: data,
    },
  })
}

function getHistoryEquipmentMatch(
  equipmentData: Equipment[],
  equipmentName: string
) {
  const normalizedName = equipmentName.trim().toLowerCase()
  return equipmentData.find(
    (equipment) => equipment.name.trim().toLowerCase() === normalizedName
  )
}

export async function updateRequisitionHistory(
  input: RequisitionHistoryPayload
) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const [history, equipmentData] = await Promise.all([
    getRequisitionHistoryData(),
    getAllEquipmentData(),
  ])
  const existingHistory = history.find((row) => row.rowNumber === input.rowNumber)

  if (!existingHistory) {
    throw new Error("ไม่พบประวัติการเบิกที่ต้องการแก้ไข")
  }

  const previousEquipment = getHistoryEquipmentMatch(
    equipmentData,
    existingHistory.equipmentName
  )

  if (!previousEquipment) {
    throw new Error(
      `ไม่พบอุปกรณ์เดิมในสต๊อก: ${existingHistory.equipmentName}`
    )
  }

  const nextEquipment = equipmentData.find(
    (equipment) => equipment.id === input.equipmentId
  )

  if (!nextEquipment) {
    throw new Error("ไม่พบอุปกรณ์ที่ต้องการบันทึกในประวัติ")
  }

  if (input.isMainUnit && (!nextEquipment.mainUnit || !nextEquipment.ratio)) {
    throw new Error(`อุปกรณ์ ${nextEquipment.name} ไม่มีหน่วยใหญ่ให้เลือกเบิก`)
  }

  const previousWasMainUnit = Boolean(
    previousEquipment.mainUnit &&
      existingHistory.unit.trim() === previousEquipment.mainUnit.trim()
  )
  const previousBaseUnits = toBaseUnit(
    existingHistory.amount,
    previousWasMainUnit,
    previousEquipment.ratio
  )
  const nextBaseUnits = toBaseUnit(
    input.amount,
    input.isMainUnit,
    nextEquipment.ratio
  )
  const stockDeltas = new Map<string, number>()

  stockDeltas.set(previousEquipment.id, -previousBaseUnits)
  stockDeltas.set(
    nextEquipment.id,
    (stockDeltas.get(nextEquipment.id) || 0) + nextBaseUnits
  )

  const stockUpdates = Array.from(stockDeltas.entries()).map(
    ([equipmentId, delta]) => {
      const equipmentIndex = equipmentData.findIndex(
        (equipment) => equipment.id === equipmentId
      )
      const equipment = equipmentData[equipmentIndex]

      if (!equipment) {
        throw new Error(`ไม่พบอุปกรณ์รหัส ${equipmentId}`)
      }

      const nextUsed = equipment.used + delta
      const nextRemaining = equipment.remaining - delta

      if (nextUsed < 0) {
        throw new Error(
          `ยอดเบิกไปแล้วของ ${equipment.name} น้อยกว่าจำนวนที่ต้องคืนจากประวัติเดิม`
        )
      }

      if (nextRemaining < 0) {
        throw new Error(
          `สต๊อก ${equipment.name} ไม่เพียงพอสำหรับจำนวนที่แก้ไข`
        )
      }

      return {
        range: stockUsageRange(equipmentIndex + 2),
        values: [[nextUsed, nextRemaining]],
      }
    }
  )

  const historyRow = [
    existingHistory.requisitionNumber,
    input.date,
    input.name,
    input.department,
    nextEquipment.name,
    input.amount,
    input.isMainUnit && nextEquipment.mainUnit
      ? nextEquipment.mainUnit
      : nextEquipment.baseUnit,
  ]

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        ...stockUpdates,
        {
          range: historyRowRange(input.rowNumber),
          values: [historyRow],
        },
      ],
    },
  })

  return {
    rowNumber: input.rowNumber,
    requisitionNumber: existingHistory.requisitionNumber,
    date: input.date,
    name: input.name,
    department: input.department,
    equipmentName: nextEquipment.name,
    amount: input.amount,
    unit:
      input.isMainUnit && nextEquipment.mainUnit
        ? nextEquipment.mainUnit
        : nextEquipment.baseUnit,
  }
}

export async function updateStock(updates: Array<{ range: string; values: unknown[][] }>) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

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
