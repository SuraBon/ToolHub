import { NextResponse } from "next/server"

import { getRequisitionHistoryData } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const history = await getRequisitionHistoryData()

    return NextResponse.json(history)
  } catch (error) {
    console.error("Error fetching requisition history:", error)
    return NextResponse.json(
      { error: "Failed to fetch requisition history" },
      { status: 500 }
    )
  }
}
