import { NextResponse } from "next/server"

import { formatApiErrorMessage, jsonError, jsonSuccess } from "@/lib/api-response"
import {
  appendEquipment,
  deleteEquipment,
  ensureWorkbookSetup,
  getAllEquipmentData,
  getAvailableEquipmentData,
  updateEquipment,
} from "@/lib/google-sheets"
import { requireHrSession } from "@/lib/hr-auth"
import { validateEquipmentPayload } from "@/lib/validation"

export async function GET(request: Request) {
  try {
    await ensureWorkbookSetup()

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope")
    const equipment =
      scope === "all" ? await getAllEquipmentData() : await getAvailableEquipmentData()

    return NextResponse.json(equipment)
  } catch (error) {
    console.error("Error fetching equipment:", error)
    return NextResponse.json(
      { error: "Failed to fetch equipment data" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireHrSession()
    if (unauthorized) return unauthorized

    const body = await request.json()
    const payload = validateEquipmentPayload(body)
    const equipment = await appendEquipment(payload)

    return jsonSuccess({ equipment }, 201)
  } catch (error) {
    console.error("Error creating equipment:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถเพิ่มอุปกรณ์ได้"), 400)
  }
}

export async function PUT(request: Request) {
  try {
    const unauthorized = requireHrSession()
    if (unauthorized) return unauthorized

    const body = await request.json()
    const equipmentId = String(body.id || "").trim()

    if (!equipmentId) {
      return jsonError("กรุณาระบุรหัสอุปกรณ์", 400)
    }

    const payload = validateEquipmentPayload({ ...body, id: equipmentId })
    const equipment = await updateEquipment(equipmentId, payload)

    return jsonSuccess({ equipment })
  } catch (error) {
    console.error("Error updating equipment:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถแก้ไขอุปกรณ์ได้"), 400)
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = requireHrSession()
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get("id")?.trim()

    if (!equipmentId) {
      return jsonError("กรุณาระบุรหัสอุปกรณ์", 400)
    }

    await deleteEquipment(equipmentId)

    return jsonSuccess({})
  } catch (error) {
    console.error("Error deleting equipment:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถลบอุปกรณ์ได้"), 400)
  }
}
