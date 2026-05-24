import { formatApiErrorMessage, jsonData, jsonError } from "@/lib/api-response"
import { getAllEquipmentData, getRequisitionHistoryData } from "@/lib/google-sheets"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"
import {
  buildReadyManagementStatus,
  getBaseManagementStatus,
} from "@/lib/management-status"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const unauthorized = await requireHrSession()
  if (unauthorized) return unauthorized

  const { status, missingRequiredEnv } = getBaseManagementStatus()

  if (missingRequiredEnv.length > 0) {
    return refreshHrSessionCookie(
      jsonData({
        equipment: [],
        history: [],
        status,
      })
    )
  }

  try {
    const [equipment, history] = await Promise.all([
      getAllEquipmentData(),
      getRequisitionHistoryData(),
    ])

    return refreshHrSessionCookie(
      jsonData({
        equipment,
        history,
        status: buildReadyManagementStatus(equipment, history),
      })
    )
  } catch (error) {
    console.error("Error fetching HR dashboard data:", error)
    return refreshHrSessionCookie(
      jsonError(formatApiErrorMessage(error, "ไม่สามารถดึงข้อมูลได้"), 500)
    )
  }
}
