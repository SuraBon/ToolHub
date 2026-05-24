import { getEnvChecks, getMissingRequiredEnv, hasEnv } from "@/lib/env"
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
