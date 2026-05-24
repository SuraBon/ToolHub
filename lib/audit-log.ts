import { getSheetsClient } from "@/lib/google-sheets"
import { requireEnv } from "@/lib/env"
import {
  AUDIT_LOG_HEADERS,
  AUDIT_LOG_SHEET_NAME,
  auditLogAppendRange,
  auditLogReadRange,
  headerRange,
} from "@/lib/google-sheets-ranges"

type AuditLogEvent = {
  action: string
  detail: string
  equipmentId?: string
  equipmentName?: string
}

export type AdminAuditLog = {
  rowNumber: number
  timestamp: string
  action: string
  detail: string
  equipmentId: string
  equipmentName: string
}

function formatAuditTimestamp(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(date)
}

async function ensureAuditLogSheetExists() {
  const sheets = await getSheetsClient()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  })
  const existingSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === AUDIT_LOG_SHEET_NAME
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
                  title: AUDIT_LOG_SHEET_NAME,
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
    range: headerRange(AUDIT_LOG_SHEET_NAME, AUDIT_LOG_HEADERS.length),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [AUDIT_LOG_HEADERS],
    },
  })

  return sheets
}

export async function logAdminEvent(event: AuditLogEvent) {
  try {
    const sheets = await ensureAuditLogSheetExists()
    const spreadsheetId = requireEnv("SPREADSHEET_ID")

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: auditLogAppendRange(),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            formatAuditTimestamp(new Date()),
            event.action,
            event.detail,
            event.equipmentId || "",
            event.equipmentName || "",
          ],
        ],
      },
    })
  } catch (error) {
    console.error("Error writing audit log:", error)
  }
}

export async function getAdminAuditLogs(limit = 200): Promise<AdminAuditLog[]> {
  const sheets = await ensureAuditLogSheetExists()
  const spreadsheetId = requireEnv("SPREADSHEET_ID")
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: auditLogReadRange(),
  })
  const rows = response.data.values || []

  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      timestamp: String(row[0] || ""),
      action: String(row[1] || ""),
      detail: String(row[2] || ""),
      equipmentId: String(row[3] || ""),
      equipmentName: String(row[4] || ""),
    }))
    .slice(-limit)
    .reverse()
}
