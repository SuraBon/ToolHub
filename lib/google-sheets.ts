import { google } from "googleapis"
import { unstable_cache, revalidateTag } from "next/cache"

import {
  HISTORY_HEADERS,
  HISTORY_SHEET_NAME,
  STOCK_HEADERS,
  STOCK_SHEET_NAME,
  headerRange,
  historyReadRange,
  historyRowRange,
  historyRowsRange,
  stockReadRange,
  stockRowRange,
  stockUsageRange,
} from "@/lib/google-sheets-ranges"
import { requireEnv } from "@/lib/env"
import { isGoogleSheetsQuotaError } from "@/lib/google-sheets-errors"
import { calculateStockUpdates } from "@/lib/stock-calculation"
import { toBaseUnit } from "@/lib/unit-conversion"
import { Equipment } from "@/types"
import type {
  RequisitionPayload,
  RequisitionHistoryCancelPayload,
  RequisitionHistoryGroupCancelPayload,
  RequisitionHistoryPayload,
} from "@/lib/validation"

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
const SHEETS_CACHE_TTL_MS = 15_000
const SHEETS_RETRY_DELAYS_MS = [500, 1000]

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

type HistoryRow = ReturnType<typeof mapHistoryRow>
type ReadOptions = {
  forceRefresh?: boolean
}

type SheetValueUpdate = {
  range: string
  values: unknown[][]
}

type SheetMetadata = {
  sheets?: Array<{
    properties?: {
      title?: string | null
      sheetId?: number | null
    } | null
  }> | null
}

let equipmentCache: CacheEntry<Equipment[]> | null = null
let historyCache: CacheEntry<HistoryRow[]> | null = null
let sheetsWriteQueue: Promise<unknown> = Promise.resolve()
let workbookSetupCompleted = false

type EquipmentInput = Omit<
  Partial<Equipment>,
  "totalStock" | "used" | "remaining" | "ratio"
> & {
  totalStock?: number | string
  used?: number | string
  remaining?: number | string
  ratio?: number | string
}

function setCachedData<T>(data: T): CacheEntry<T> {
  return {
    data,
    expiresAt: Date.now() + SHEETS_CACHE_TTL_MS,
  }
}

function clearEquipmentCache() {
  equipmentCache = null
}

function clearHistoryCache() {
  historyCache = null
}

function clearSheetsCache() {
  clearEquipmentCache()
  clearHistoryCache()
  try {
    revalidateTag("equipment", "max")
    revalidateTag("history", "max")
  } catch (e) {
    // Ignore if not in Next.js context
  }
}

function queueSheetsWrite<T>(operation: () => Promise<T>) {
  const queuedWrite = sheetsWriteQueue.then(operation, operation)
  sheetsWriteQueue = queuedWrite.catch(() => undefined)

  return queuedWrite
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withSheetsRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown

  for (let attempt = 0; attempt <= SHEETS_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (
        attempt >= SHEETS_RETRY_DELAYS_MS.length ||
        !isGoogleSheetsQuotaError(error)
      ) {
        throw error
      }

      await sleep(SHEETS_RETRY_DELAYS_MS[attempt])
    }
  }

  throw lastError
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
  const metadata = await withSheetsRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })
  )
  const existingSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetName
  )

  if (!existingSheet) {
    try {
      await withSheetsRetry(() =>
        sheets.spreadsheets.batchUpdate({
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
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (!message.includes("already exists")) {
        throw error
      }
    }
  }

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange(sheetName, headers.length),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [headers],
      },
    })
  )
}

export async function ensureWorkbookSetup() {
  if (workbookSetupCompleted) return
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  await Promise.all([
    ensureSheetExists(sheets, spreadsheetId, STOCK_SHEET_NAME, STOCK_HEADERS),
    ensureSheetExists(sheets, spreadsheetId, HISTORY_SHEET_NAME, HISTORY_HEADERS),
  ])
  workbookSetupCompleted = true
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

function mapHistoryRow(row: string[], index: number) {
  const amountWithEquipmentId = Number(row[6])
  const hasEquipmentIdColumn = Number.isFinite(amountWithEquipmentId)

  return {
    rowNumber: index + 2,
    requisitionNumber: row[0] || "",
    date: row[1] || "",
    name: row[2] || "",
    department: row[3] || "",
    equipmentId: hasEquipmentIdColumn ? row[4] || "" : "",
    equipmentName: hasEquipmentIdColumn ? row[5] || "" : row[4] || "",
    amount: hasEquipmentIdColumn ? toNumber(row[6]) : toNumber(row[5]),
    unit: hasEquipmentIdColumn ? row[7] || "" : row[6] || "",
    requestId: hasEquipmentIdColumn ? row[8] || "" : row[7] || "",
    status: row[9] || "ปกติ",
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

function getSheetId(metadata: SheetMetadata, sheetName: string) {
  const sheet = metadata.sheets?.find(
    (item) => item.properties?.title === sheetName
  )
  const sheetId = sheet?.properties?.sheetId

  if (sheetId === undefined || sheetId === null) {
    throw new Error(`ไม่พบชีต${sheetName}`)
  }

  return sheetId
}

function stockUsageCellsUpdateRequest({
  sheetId,
  rowIndex,
  used,
  remaining,
}: {
  sheetId: number
  rowIndex: number
  used: number
  remaining: number
}) {
  return {
    updateCells: {
      range: {
        sheetId,
        startRowIndex: rowIndex - 1,
        endRowIndex: rowIndex,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      rows: [
        {
          values: [
            { userEnteredValue: { numberValue: used } },
            { userEnteredValue: { numberValue: remaining } },
          ],
        },
      ],
      fields: "userEnteredValue",
    },
  }
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

async function readAllEquipmentData(forceRefresh: boolean) {
  await ensureWorkbookSetup()
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  try {
    const response = await withSheetsRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: stockReadRange(),
      })
    )

    const rows = response.data.values || []
    const equipment = rows.map((row, index) => mapEquipmentRow(row as string[], index))
    equipmentCache = setCachedData(equipment)

    return equipment
  } catch (error) {
    if (!forceRefresh && isGoogleSheetsQuotaError(error) && equipmentCache) {
      return equipmentCache.data
    }

    throw error
  }
}

const getCachedEquipment = unstable_cache(
  async () => readAllEquipmentData(true),
  ["equipment-data"],
  { revalidate: 15, tags: ["equipment"] }
)

export async function getAllEquipmentData({ forceRefresh = false }: ReadOptions = {}) {
  if (forceRefresh) {
    const data = await readAllEquipmentData(true)
    try {
      revalidateTag("equipment", "max")
    } catch (e) {
      // Ignore in non-Next environment
    }
    return data
  }
  return getCachedEquipment()
}

async function readRequisitionHistoryData(forceRefresh: boolean) {
  await ensureWorkbookSetup()
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")

  try {
    const response = await withSheetsRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: historyReadRange(),
      })
    )

    const rows = response.data.values || []
    const history = rows
      .map((row, index) => mapHistoryRow(row as string[], index))
      .filter((row) => row.status !== "ยกเลิก")
    historyCache = setCachedData(history)

    return history
  } catch (error) {
    if (!forceRefresh && isGoogleSheetsQuotaError(error) && historyCache) {
      return historyCache.data
    }

    throw error
  }
}

const getCachedHistory = unstable_cache(
  async () => readRequisitionHistoryData(true),
  ["history-data"],
  { revalidate: 15, tags: ["history"] }
)

export async function getRequisitionHistoryData({
  forceRefresh = false,
}: ReadOptions = {}) {
  if (forceRefresh) {
    const data = await readRequisitionHistoryData(true)
    try {
      revalidateTag("history", "max")
    } catch (e) {
      // Ignore in non-Next environment
    }
    return data
  }
  return getCachedHistory()
}

export async function getAvailableEquipmentData() {
  const equipment = await getAllEquipmentData()
  return equipment.filter((item) => item.remaining > 0)
}

export async function getEquipmentData(options?: ReadOptions) {
  return getAllEquipmentData(options)
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
  return queueSheetsWrite(() => appendEquipmentFixedRow(input))
}

async function appendEquipmentFixedRow(input: EquipmentInput) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const existingEquipment = await getAllEquipmentData({ forceRefresh: true })
  const fallbackId = generateNextEquipmentId(existingEquipment)
  const equipment = normalizeEquipmentInput({ ...input, id: "" }, fallbackId)
  const validationError = validateEquipmentInput(equipment)

  if (validationError) {
    throw new Error(validationError)
  }

  if (existingEquipment.some((item) => item.id === equipment.id)) {
    throw new Error("รหัสอุปกรณ์นี้มีอยู่แล้ว")
  }

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: stockRowRange(existingEquipment.length + 2),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [equipmentToRow(equipment)],
      },
    })
  )

  clearEquipmentCache()
  return equipment
}

export async function updateEquipment(equipmentId: string, input: EquipmentInput) {
  return queueSheetsWrite(() => updateEquipmentFixedRow(equipmentId, input))
}

async function updateEquipmentFixedRow(equipmentId: string, input: EquipmentInput) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const existingEquipment = await getAllEquipmentData({ forceRefresh: true })
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

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: stockRowRange(rowIndex + 2),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [equipmentToRow(equipment)],
      },
    })
  )

  clearEquipmentCache()
  return {
    equipment,
    previousEquipment: existingEquipment[rowIndex],
  }
}

export async function deleteEquipment(equipmentId: string) {
  return queueSheetsWrite(() => deleteEquipmentFixedRow(equipmentId))
}

async function deleteEquipmentFixedRow(equipmentId: string) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const existingEquipment = await getAllEquipmentData({ forceRefresh: true })
  const rowIndex = existingEquipment.findIndex((item) => item.id === equipmentId)

  if (rowIndex === -1) {
    throw new Error("ไม่พบอุปกรณ์ที่ต้องการลบ")
  }
  const deletedEquipment = existingEquipment[rowIndex]

  const metadata = await withSheetsRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })
  )
  const stockSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === STOCK_SHEET_NAME
  )
  const sheetId = stockSheet?.properties?.sheetId

  if (sheetId === undefined || sheetId === null) {
    throw new Error("ไม่พบชีตสต๊อกอุปกรณ์")
  }

  await withSheetsRetry(() =>
    sheets.spreadsheets.batchUpdate({
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
  )

  clearEquipmentCache()
  return deletedEquipment
}

export async function findRequisitionHistoryByNumber(requisitionNumber: string) {
  const normalizedRequisitionNumber = requisitionNumber.trim()

  if (!normalizedRequisitionNumber) {
    return []
  }

  const history = await getRequisitionHistoryData({ forceRefresh: true })
  return history.filter(
    (row) => row.requisitionNumber.trim() === normalizedRequisitionNumber
  )
}

export async function findRequisitionHistoryByRequestId(requestId: string) {
  const normalizedRequestId = requestId.trim()

  if (!normalizedRequestId) {
    return []
  }

  const history = await getRequisitionHistoryData({ forceRefresh: true })
  return history.filter((row) => row.requestId.trim() === normalizedRequestId)
}

async function executeSaveRequisitionBatch({
  stockUpdates,
  historyRows,
}: {
  stockUpdates: SheetValueUpdate[]
  historyRows: unknown[][]
}) {
  if (historyRows.length === 0) {
    throw new Error("ไม่มีรายการประวัติการเบิกสำหรับบันทึก")
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const history = await getRequisitionHistoryData({ forceRefresh: true })
  const nextHistoryRowIndex = history.length + 2

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          ...stockUpdates,
          {
            range: historyRowsRange(nextHistoryRowIndex, historyRows.length),
            values: historyRows,
          },
        ],
      },
    })
  )

  clearSheetsCache()
}

export async function saveRequisitionBatch(input: {
  stockUpdates: SheetValueUpdate[]
  historyRows: unknown[][]
}) {
  return queueSheetsWrite(() => executeSaveRequisitionBatch(input))
}

async function executeSaveRequisition({
  requisition,
  requisitionNumber,
  formattedDate,
  requestId,
}: {
  requisition: RequisitionPayload
  requisitionNumber: string
  formattedDate: string
  requestId?: string
}) {
  const equipmentData = await getAllEquipmentData({ forceRefresh: true })
  const { stockUpdates, historyRows } = calculateStockUpdates(
    requisition,
    equipmentData,
    requisitionNumber,
    formattedDate,
    requestId
  )

  await executeSaveRequisitionBatch({ stockUpdates, historyRows })
}

export async function saveRequisition(input: {
  requisition: RequisitionPayload
  requisitionNumber: string
  formattedDate: string
  requestId?: string
}) {
  return queueSheetsWrite(() => executeSaveRequisition(input))
}

function getHistoryEquipmentMatch(
  equipmentData: Equipment[],
  history: Pick<HistoryRow, "equipmentId" | "equipmentName">
) {
  const normalizedId = history.equipmentId.trim().toLowerCase()

  if (normalizedId) {
    const equipmentById = equipmentData.find(
      (equipment) => equipment.id.trim().toLowerCase() === normalizedId
    )

    if (equipmentById) {
      return equipmentById
    }
  }

  const normalizedName = history.equipmentName.trim().toLowerCase()
  return equipmentData.find(
    (equipment) => equipment.name.trim().toLowerCase() === normalizedName
  )
}

export async function updateRequisitionHistory(
  input: RequisitionHistoryPayload
) {
  return queueSheetsWrite(() => updateRequisitionHistoryFixedRow(input))
}

async function updateRequisitionHistoryFixedRow(
  input: RequisitionHistoryPayload
) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const [history, equipmentData] = await Promise.all([
    getRequisitionHistoryData({ forceRefresh: true }),
    getAllEquipmentData({ forceRefresh: true }),
  ])
  const existingHistory = history.find((row) => row.rowNumber === input.rowNumber)

  if (!existingHistory) {
    throw new Error("ไม่พบประวัติการเบิกที่ต้องการแก้ไข")
  }

  const previousEquipment = getHistoryEquipmentMatch(equipmentData, existingHistory)

  const nextEquipment = equipmentData.find(
    (equipment) => equipment.id === input.equipmentId
  )

  if (nextEquipment && input.isMainUnit && (!nextEquipment.mainUnit || !nextEquipment.ratio)) {
    throw new Error(`อุปกรณ์ ${nextEquipment.name} ไม่มีหน่วยใหญ่ให้เลือกเบิก`)
  }

  const previousWasMainUnit = Boolean(
    previousEquipment?.mainUnit &&
      existingHistory.unit.trim().toLowerCase() === previousEquipment.mainUnit.trim().toLowerCase()
  )
  const previousBaseUnits = previousEquipment
    ? toBaseUnit(
        existingHistory.amount,
        previousWasMainUnit,
        previousEquipment.ratio
      )
    : 0

  const nextBaseUnits = nextEquipment
    ? toBaseUnit(
        input.amount,
        input.isMainUnit,
        nextEquipment.ratio
      )
    : 0

  const stockDeltas = new Map<string, number>()

  if (previousEquipment) {
    stockDeltas.set(previousEquipment.id, -previousBaseUnits)
  }
  if (nextEquipment) {
    stockDeltas.set(
      nextEquipment.id,
      (stockDeltas.get(nextEquipment.id) || 0) + nextBaseUnits
    )
  }

  const stockUpdates = Array.from(stockDeltas.entries()).map(
    ([equipmentId, delta]) => {
      const equipmentIndex = equipmentData.findIndex(
        (equipment) => equipment.id === equipmentId
      )
      const equipment = equipmentData[equipmentIndex]

      if (!equipment) {
        throw new Error(`ไม่พบอุปกรณ์รหัส ${equipmentId}`)
      }

      const nextUsed = Number((equipment.used + delta).toFixed(4))
      const nextRemaining = Number((equipment.remaining - delta).toFixed(4))

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
    nextEquipment ? nextEquipment.id : input.equipmentId,
    nextEquipment ? nextEquipment.name : existingHistory.equipmentName,
    input.amount,
    nextEquipment
      ? (input.isMainUnit && nextEquipment.mainUnit
          ? nextEquipment.mainUnit
          : nextEquipment.baseUnit)
      : existingHistory.unit,
    existingHistory.requestId || "",
  ]

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.batchUpdate({
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
  )

  clearSheetsCache()
  return {
    rowNumber: input.rowNumber,
    requisitionNumber: existingHistory.requisitionNumber,
    date: input.date,
    name: input.name,
    department: input.department,
    equipmentName: nextEquipment ? nextEquipment.name : existingHistory.equipmentName,
    amount: input.amount,
    unit: nextEquipment
      ? (input.isMainUnit && nextEquipment.mainUnit
          ? nextEquipment.mainUnit
          : nextEquipment.baseUnit)
      : existingHistory.unit,
  }
}

export async function cancelRequisitionHistory(
  input: RequisitionHistoryCancelPayload
) {
  return queueSheetsWrite(() => cancelRequisitionHistoryFixedRow(input))
}

async function cancelRequisitionHistoryFixedRow(
  input: RequisitionHistoryCancelPayload
) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const [history, equipmentData] = await Promise.all([
    getRequisitionHistoryData({ forceRefresh: true }),
    getAllEquipmentData({ forceRefresh: true }),
  ])
  const existingHistory = history.find((row) => row.rowNumber === input.rowNumber)

  if (!existingHistory) {
    throw new Error("ไม่พบประวัติการเบิกที่ต้องการยกเลิก")
  }

  const equipment = getHistoryEquipmentMatch(equipmentData, existingHistory)

  const returnedBaseUnits = equipment
    ? toBaseUnit(
        existingHistory.amount,
        Boolean(equipment.mainUnit && existingHistory.unit.trim().toLowerCase() === equipment.mainUnit.trim().toLowerCase()),
        equipment.ratio
      )
    : 0

  const equipmentIndex = equipment
    ? equipmentData.findIndex((item) => item.id === equipment.id)
    : -1

  const nextUsed = equipment ? Number((equipment.used - returnedBaseUnits).toFixed(4)) : 0
  const nextRemaining = equipment ? Number((equipment.remaining + returnedBaseUnits).toFixed(4)) : 0

  if (equipment && equipmentIndex === -1) {
    throw new Error(`ไม่พบอุปกรณ์รหัส ${equipment.id}`)
  }

  if (equipment && nextUsed < 0) {
    throw new Error(
      `ยอดเบิกไปแล้วของ ${equipment.name} น้อยกว่าจำนวนที่ต้องคืน`
    )
  }

  const metadata = await withSheetsRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })
  )
  const stockSheetId = getSheetId(metadata.data, STOCK_SHEET_NAME)
  const historySheetId = getSheetId(metadata.data, HISTORY_SHEET_NAME)

  const requests: any[] = []

  if (equipment) {
    requests.push(
      stockUsageCellsUpdateRequest({
        sheetId: stockSheetId,
        rowIndex: equipmentIndex + 2,
        used: nextUsed,
        remaining: nextRemaining,
      })
    )
  }

  requests.push({
    updateCells: {
      range: {
        sheetId: historySheetId,
        startRowIndex: input.rowNumber - 1,
        endRowIndex: input.rowNumber,
        startColumnIndex: 9,
        endColumnIndex: 10,
      },
      rows: [
        {
          values: [
            { userEnteredValue: { stringValue: "ยกเลิก" } },
          ],
        },
      ],
      fields: "userEnteredValue",
    },
  })

  await withSheetsRetry(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    })
  )

  clearSheetsCache()
  return existingHistory
}

export async function cancelRequisitionHistoryGroup(
  input: RequisitionHistoryGroupCancelPayload
) {
  return queueSheetsWrite(() => cancelRequisitionHistoryGroupFixedRows(input))
}

async function cancelRequisitionHistoryGroupFixedRows(
  input: RequisitionHistoryGroupCancelPayload
) {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const [history, equipmentData] = await Promise.all([
    getRequisitionHistoryData({ forceRefresh: true }),
    getAllEquipmentData({ forceRefresh: true }),
  ])
  const targetRows = history
    .filter((row) => row.requisitionNumber === input.requisitionNumber)
    .sort((a, b) => b.rowNumber - a.rowNumber)

  if (targetRows.length === 0) {
    throw new Error("ไม่พบคำขอเบิกที่ต้องการยกเลิก")
  }

  const returnedBaseUnitsByEquipmentId = new Map<string, number>()

  for (const row of targetRows) {
    const equipment = getHistoryEquipmentMatch(equipmentData, row)

    if (equipment) {
      const wasMainUnit = Boolean(
        equipment.mainUnit && row.unit.trim().toLowerCase() === equipment.mainUnit.trim().toLowerCase()
      )
      const returnedBaseUnits = toBaseUnit(row.amount, wasMainUnit, equipment.ratio)

      returnedBaseUnitsByEquipmentId.set(
        equipment.id,
        (returnedBaseUnitsByEquipmentId.get(equipment.id) || 0) + returnedBaseUnits
      )
    }
  }

  const stockUpdates = Array.from(returnedBaseUnitsByEquipmentId.entries()).map(
    ([equipmentId, returnedBaseUnits]) => {
      const equipmentIndex = equipmentData.findIndex((item) => item.id === equipmentId)
      const equipment = equipmentData[equipmentIndex]

      if (!equipment) {
        throw new Error(`ไม่พบอุปกรณ์รหัส ${equipmentId}`)
      }

      const nextUsed = Number((equipment.used - returnedBaseUnits).toFixed(4))
      const nextRemaining = Number((equipment.remaining + returnedBaseUnits).toFixed(4))

      if (nextUsed < 0) {
        throw new Error(
          `ยอดเบิกไปแล้วของ ${equipment.name} น้อยกว่าจำนวนที่ต้องคืน`
        )
      }

      return {
        range: stockUsageRange(equipmentIndex + 2),
        values: [[nextUsed, nextRemaining]],
      }
    }
  )

  const metadata = await withSheetsRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })
  )
  const stockSheetId = getSheetId(metadata.data, STOCK_SHEET_NAME)
  const historySheetId = getSheetId(metadata.data, HISTORY_SHEET_NAME)

  await withSheetsRetry(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          ...stockUpdates.map((update) => {
            const match = update.range.match(/![A-Z]+(\d+):[A-Z]+\d+$/)
            const rowIndex = match ? Number(match[1]) : 0
            const [used, remaining] = update.values[0] || []

            if (!rowIndex || typeof used !== "number" || typeof remaining !== "number") {
              throw new Error("ข้อมูลคืนสต๊อกไม่ถูกต้อง")
            }

            return stockUsageCellsUpdateRequest({
              sheetId: stockSheetId,
              rowIndex,
              used,
              remaining,
            })
          }),
          ...targetRows.map((row) => ({
            updateCells: {
              range: {
                sheetId: historySheetId,
                startRowIndex: row.rowNumber - 1,
                endRowIndex: row.rowNumber,
                startColumnIndex: 9,
                endColumnIndex: 10,
              },
              rows: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "ยกเลิก" } },
                  ],
                },
              ],
              fields: "userEnteredValue",
            },
          })),
        ],
      },
    })
  )

  clearSheetsCache()
  return {
    requisitionNumber: input.requisitionNumber,
    canceledCount: targetRows.length,
    history: targetRows,
  }
}
