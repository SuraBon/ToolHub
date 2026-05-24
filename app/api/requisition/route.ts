import {
  formatApiErrorMessage,
  isValidationError,
  jsonError,
  jsonSuccess,
} from "@/lib/api-response"
import { formatThaiDate } from "@/lib/date-format"
import {
  findRequisitionHistoryByNumber,
  getEquipmentData,
  saveRequisitionBatch,
} from "@/lib/google-sheets"
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
const inFlightRequisitions = new Map<string, Promise<RequisitionResponseData>>()

function getRequestId(body: unknown) {
  if (!body || typeof body !== "object" || !("requestId" in body)) {
    return ""
  }

  const requestId = String((body as { requestId?: unknown }).requestId || "").trim()
  return requestId.length <= 128 ? requestId : ""
}

async function processRequisition(
  body: unknown,
  requestId: string,
  requisitionNumber: string
): Promise<RequisitionResponseData> {
  let writeAttempted = false

  try {
    const requisition = validateRequisitionPayload(body)

    const existingHistory = await findRequisitionHistoryByNumber(requisitionNumber)

    if (existingHistory.length > 0) {
      const responseData = {
        requisitionNumber,
        message: "ส่งคำขอเบิกสำเร็จ",
      }

      if (requestId) {
        idempotencyCache.set(requestId, responseData)
      }

      return responseData
    }

    const equipmentData = await getEquipmentData({ forceRefresh: true })
    const currentDate = new Date()
    const { stockUpdates, historyRows } = calculateStockUpdates(
      requisition,
      equipmentData,
      requisitionNumber,
      formatThaiDate(currentDate)
    )

    writeAttempted = true
    await saveRequisitionBatch({ stockUpdates, historyRows })

    const responseData = {
      requisitionNumber,
      message: "ส่งคำขอเบิกสำเร็จ",
    }

    if (requestId) {
      idempotencyCache.set(requestId, responseData)
    }

    return responseData
  } catch (error) {
    if (!writeAttempted) {
      throw error
    }

    if (requestId) {
      try {
        const existingHistory = await findRequisitionHistoryByNumber(requisitionNumber)

        if (existingHistory.length > 0) {
          const responseData = {
            requisitionNumber,
            message: "ส่งคำขอเบิกสำเร็จ",
          }

          idempotencyCache.set(requestId, responseData)
          return responseData
        }
      } catch (readBackError) {
        console.error("Error reading back requisition after write failure:", {
          requestId,
          requisitionNumber,
          error: readBackError,
        })
      }
    }

    console.error("Error processing requisition write:", {
      requestId,
      requisitionNumber,
      error,
    })
    throw error
  }
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

      const inFlight = inFlightRequisitions.get(requestId)

      if (inFlight) {
        return jsonSuccess(await inFlight)
      }
    }

    const requisitionNumber = `REQ${Date.now()}`
    const processing = processRequisition(body, requestId, requisitionNumber)

    if (!requestId) {
      return jsonSuccess(await processing)
    }

    inFlightRequisitions.set(requestId, processing)

    try {
      return jsonSuccess(await processing)
    } finally {
      if (inFlightRequisitions.get(requestId) === processing) {
        inFlightRequisitions.delete(requestId)
      }
    }
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
