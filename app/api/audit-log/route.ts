import { formatApiErrorMessage, jsonData, jsonError } from "@/lib/api-response"
import { getAdminAuditLogs } from "@/lib/audit-log"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"

export async function GET() {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const logs = await getAdminAuditLogs()

    return refreshHrSessionCookie(jsonData(logs))
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return jsonError(
      formatApiErrorMessage(error, "ไม่สามารถดึงข้อมูล Log ได้"),
      500
    )
  }
}
