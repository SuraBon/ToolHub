import { getEnvChecks, getMissingRequiredEnv, hasEnv } from "@/lib/env"
import {
  GOOGLE_SHEETS_QUOTA_MESSAGE,
  isGoogleSheetsQuotaError,
} from "@/lib/google-sheets-errors"
import type { Equipment } from "@/types"

type RequisitionHistorySummary = {
  length: number
}

export function getBaseManagementStatus() {
  const missingRequiredEnv = getMissingRequiredEnv()
  const checks = getEnvChecks()
  const baseStatus = {
    checkedAt: new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Bangkok",
    }).format(new Date()),
    environment: checks,
    blobReady: hasEnv("BLOB_READ_WRITE_TOKEN"),
  }

  if (missingRequiredEnv.length > 0) {
    return {
      status: {
        ...baseStatus,
        ok: false,
        googleSheetsReady: false,
        error: `ยังไม่ได้ตั้งค่า ${missingRequiredEnv.join(", ")}`,
        inventory: null,
        history: null,
      },
      missingRequiredEnv,
    }
  }

  return {
    status: baseStatus,
    missingRequiredEnv,
  }
}

export function buildReadyManagementStatus(
  equipment: Equipment[],
  history: RequisitionHistorySummary
) {
  const { status } = getBaseManagementStatus()
  const outOfStock = equipment.filter((item) => item.remaining <= 0).length

  return {
    ...status,
    ok: true,
    googleSheetsReady: true,
    error: null,
    inventory: {
      total: equipment.length,
      available: equipment.length - outOfStock,
      outOfStock,
    },
    history: {
      total: history.length,
    },
  }
}

function getGoogleSheetsErrorMessage(error: unknown) {
  if (isGoogleSheetsQuotaError(error)) {
    return GOOGLE_SHEETS_QUOTA_MESSAGE
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error)

  if (
    message.includes("credential") ||
    message.includes("private_key") ||
    message.includes("invalid_grant") ||
    message.includes("unauthorized") ||
    message.includes("permission")
  ) {
    return "การตั้งค่า Google Sheets หรือสิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาตรวจสอบ credentials และการแชร์ไฟล์"
  }

  if (
    message.includes("spreadsheet") ||
    message.includes("not found") ||
    message.includes("requested entity was not found")
  ) {
    return "ไม่พบไฟล์ Google Sheets ที่ตั้งค่าไว้ กรุณาตรวจสอบ SPREADSHEET_ID"
  }

  return "ไม่สามารถอ่านข้อมูลจาก Google Sheets ได้ กรุณาลองใหม่อีกครั้ง"
}

export function buildErrorManagementStatus(error: unknown) {
  const { status } = getBaseManagementStatus()

  return {
    ...status,
    ok: false,
    googleSheetsReady: false,
    error: getGoogleSheetsErrorMessage(error),
    inventory: null,
    history: null,
  }
}
