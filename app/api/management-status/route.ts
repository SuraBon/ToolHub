import { jsonData } from "@/lib/api-response"
import { getAllEquipmentData, getRequisitionHistoryData } from "@/lib/google-sheets"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"
import {
  buildErrorManagementStatus,
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
    return refreshHrSessionCookie(jsonData(status))
  }

  try {
    const [equipment, history] = await Promise.all([
      getAllEquipmentData(),
      getRequisitionHistoryData(),
    ])

    return refreshHrSessionCookie(
      jsonData(buildReadyManagementStatus(equipment, history))
    )
  } catch (error) {
    console.error("Error checking management status:", error)
    return refreshHrSessionCookie(
      jsonData(buildErrorManagementStatus(error))
    )
  }
}
