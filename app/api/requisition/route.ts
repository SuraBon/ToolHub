import {
  formatApiErrorMessage,
  isValidationError,
  jsonError,
  jsonSuccess,
} from "@/lib/api-response"
import { formatThaiDate } from "@/lib/date-format"
import { appendRequisition, getEquipmentData, updateStock } from "@/lib/google-sheets"
import { calculateStockUpdates } from "@/lib/stock-calculation"
import { validateRequisitionPayload } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const requisition = validateRequisitionPayload(body)

    // Fetch latest equipment data for concurrency check
    const equipmentData = await getEquipmentData()
    const requisitionNumber = `REQ${Date.now()}`
    const currentDate = new Date()
    const { stockUpdates, historyRows } = calculateStockUpdates(
      requisition,
      equipmentData,
      requisitionNumber,
      formatThaiDate(currentDate)
    )

    // Execute updates
    await updateStock(stockUpdates)
    await appendRequisition(historyRows)

    return jsonSuccess({
      requisitionNumber,
      message: "ส่งคำขอเบิกสำเร็จ",
    })
  } catch (error) {
    if (!isValidationError(error)) {
      console.error("Error processing requisition:", error)
    }
    return jsonError(
      formatApiErrorMessage(error, "ไม่สามารถส่งคำขอเบิกได้"),
      400
    )
  }
}
