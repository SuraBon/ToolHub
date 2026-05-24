import {
  formatApiErrorMessage,
  isValidationError,
  jsonError,
  jsonSuccess,
} from "@/lib/api-response"
import { formatThaiDate } from "@/lib/date-format"
import { appendRequisition, getEquipmentData, updateStock } from "@/lib/google-sheets"
import { createIdempotencyCache } from "@/lib/idempotency-cache"
import { calculateStockUpdates } from "@/lib/stock-calculation"
import { validateRequisitionPayload } from "@/lib/validation"

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000

type RequisitionResponseData = {
  requisitionNumber: string
  message: string
}

const idempotencyCache =
  createIdempotencyCache<RequisitionResponseData>(IDEMPOTENCY_TTL_MS)

function getRequestId(body: unknown) {
  if (!body || typeof body !== "object" || !("requestId" in body)) {
    return ""
  }

  const requestId = String((body as { requestId?: unknown }).requestId || "").trim()
  return requestId.length <= 128 ? requestId : ""
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const requestId = getRequestId(body)

    if (requestId) {
      const cached = idempotencyCache.get(requestId)

      if (cached) {
        return jsonSuccess(cached)
      }
    }

    const requisition = validateRequisitionPayload(body)

    // Fetch latest equipment data for concurrency check
    const equipmentData = await getEquipmentData({ forceRefresh: true })
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

    const responseData = {
      requisitionNumber,
      message: "ส่งคำขอเบิกสำเร็จ",
    }

    if (requestId) {
      idempotencyCache.set(requestId, responseData)
    }

    return jsonSuccess(responseData)
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
