import {
  formatApiErrorMessage,
  jsonData,
  jsonError,
  jsonSuccess,
} from "@/lib/api-response"
import { logAdminEvent } from "@/lib/audit-log"
import {
  cancelRequisitionHistoryGroup,
  cancelRequisitionHistory,
  getRequisitionHistoryData,
  updateRequisitionHistory,
} from "@/lib/google-sheets"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"
import {
  validateRequisitionHistoryCancelPayload,
  validateRequisitionHistoryGroupCancelPayload,
  validateRequisitionHistoryPayload,
} from "@/lib/validation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const history = await getRequisitionHistoryData()

    return refreshHrSessionCookie(jsonData(history))
  } catch (error) {
    console.error("Error fetching requisition history:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถดึงประวัติการเบิกได้"), 500)
  }
}

export async function PUT(request: Request) {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const body = await request.json()
    const payload = validateRequisitionHistoryPayload(body)
    const history = await updateRequisitionHistory(payload)

    await logAdminEvent({
      action: "update_requisition_history",
      detail: `แก้ไขประวัติการเบิก ${history.requisitionNumber}`,
      equipmentName: history.equipmentName,
    })

    return refreshHrSessionCookie(jsonSuccess({ history }))
  } catch (error) {
    console.error("Error updating requisition history:", error)
    return jsonError(
      formatApiErrorMessage(error, "ไม่สามารถแก้ไขประวัติการเบิกได้"),
      400
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const requisitionNumber = searchParams.get("requisitionNumber")

    if (requisitionNumber) {
      const payload = validateRequisitionHistoryGroupCancelPayload({
        requisitionNumber,
      })
      const result = await cancelRequisitionHistoryGroup(payload)

      await logAdminEvent({
        action: "cancel_requisition_group",
        detail: `ยกเลิกคำขอเบิก ${result.requisitionNumber} จำนวน ${result.canceledCount} รายการ`,
      })

      return refreshHrSessionCookie(jsonSuccess(result))
    }

    const payload = validateRequisitionHistoryCancelPayload({
      rowNumber: searchParams.get("rowNumber"),
    })
    const history = await cancelRequisitionHistory(payload)

    await logAdminEvent({
      action: "cancel_requisition_history",
      detail: `ยกเลิกการเบิก ${history.requisitionNumber}`,
      equipmentName: history.equipmentName,
    })

    return refreshHrSessionCookie(jsonSuccess({ history }))
  } catch (error) {
    console.error("Error canceling requisition history:", error)
    return jsonError(
      formatApiErrorMessage(error, "ไม่สามารถยกเลิกการเบิกได้"),
      400
    )
  }
}
