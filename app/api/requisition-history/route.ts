import { NextResponse } from "next/server"

import { jsonError } from "@/lib/api-response"
import { getRequisitionHistoryData } from "@/lib/google-sheets"
import { requireHrSession } from "@/lib/hr-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const unauthorized = requireHrSession()
    if (unauthorized) return unauthorized

    const history = await getRequisitionHistoryData()

    return NextResponse.json(history)
  } catch (error) {
    console.error("Error fetching requisition history:", error)
    return jsonError("ไม่สามารถดึงประวัติการเบิกได้", 500)
  }
}
