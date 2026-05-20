import { formatApiErrorMessage, jsonData, jsonError, jsonSuccess } from "@/lib/api-response"
import { logAdminEvent } from "@/lib/audit-log"
import {
  appendEquipment,
  deleteEquipment,
  ensureWorkbookSetup,
  getAllEquipmentData,
  getAvailableEquipmentData,
  updateEquipment,
} from "@/lib/google-sheets"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"
import { validateEquipmentPayload } from "@/lib/validation"

export async function GET(request: Request) {
  try {
    await ensureWorkbookSetup()

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope")
    const equipment =
      scope === "all" ? await getAllEquipmentData() : await getAvailableEquipmentData()

    return jsonData(equipment)
  } catch (error) {
    console.error("Error fetching equipment:", error)
    return jsonError("ไม่สามารถดึงข้อมูลอุปกรณ์ได้", 500)
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const body = await request.json()
    const payload = validateEquipmentPayload(body)
    const equipment = await appendEquipment(payload)
    await logAdminEvent({
      action: "add_equipment",
      detail: "เพิ่มอุปกรณ์ใหม่",
      equipmentId: equipment.id,
      equipmentName: equipment.name,
    })

    return refreshHrSessionCookie(jsonSuccess({ equipment }, 201))
  } catch (error) {
    console.error("Error creating equipment:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถเพิ่มอุปกรณ์ได้"), 400)
  }
}

export async function PUT(request: Request) {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const body = await request.json()
    const equipmentId = String(body.id || "").trim()

    if (!equipmentId) {
      return jsonError("กรุณาระบุรหัสอุปกรณ์", 400)
    }

    const payload = validateEquipmentPayload({ ...body, id: equipmentId })
    const equipment = await updateEquipment(equipmentId, payload)
    await logAdminEvent({
      action: "update_equipment",
      detail: "แก้ไขข้อมูลอุปกรณ์",
      equipmentId: equipment.id,
      equipmentName: equipment.name,
    })

    return refreshHrSessionCookie(jsonSuccess({ equipment }))
  } catch (error) {
    console.error("Error updating equipment:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถแก้ไขอุปกรณ์ได้"), 400)
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get("id")?.trim()

    if (!equipmentId) {
      return jsonError("กรุณาระบุรหัสอุปกรณ์", 400)
    }

    const equipment = await deleteEquipment(equipmentId)
    await logAdminEvent({
      action: "delete_equipment",
      detail: "ลบอุปกรณ์",
      equipmentId: equipment.id,
      equipmentName: equipment.name,
    })

    return refreshHrSessionCookie(jsonSuccess({}))
  } catch (error) {
    console.error("Error deleting equipment:", error)
    return jsonError(formatApiErrorMessage(error, "ไม่สามารถลบอุปกรณ์ได้"), 400)
  }
}
