import { jsonData, jsonError } from "@/lib/api-response"
import { getEnvChecks, getMissingRequiredEnv, hasEnv } from "@/lib/env"
import { getAllEquipmentData, getRequisitionHistoryData } from "@/lib/google-sheets"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"
import { LOW_STOCK_THRESHOLD } from "@/lib/equipment-utils"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const unauthorized = await requireHrSession()
  if (unauthorized) return unauthorized

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
    return refreshHrSessionCookie(jsonData({
      ...baseStatus,
      ok: false,
      googleSheetsReady: false,
      error: `ยังไม่ได้ตั้งค่า ${missingRequiredEnv.join(", ")}`,
      inventory: null,
      history: null,
    }))
  }

  try {
    const [equipment, history] = await Promise.all([
      getAllEquipmentData(),
      getRequisitionHistoryData(),
    ])
    const outOfStock = equipment.filter((item) => item.remaining <= 0).length
    const lowStock = equipment.filter(
      (item) => item.remaining > 0 && item.remaining <= LOW_STOCK_THRESHOLD
    ).length

    return refreshHrSessionCookie(jsonData({
      ...baseStatus,
      ok: true,
      googleSheetsReady: true,
      error: null,
      inventory: {
        total: equipment.length,
        available: equipment.length - outOfStock,
        lowStock,
        outOfStock,
      },
      history: {
        total: history.length,
      },
    }))
  } catch (error) {
    console.error("Error checking management status:", error)
    return jsonError("ไม่สามารถตรวจสอบสถานะระบบได้", 500)
  }
}
