import { NextResponse } from "next/server"

import {
  appendEquipment,
  deleteEquipment,
  ensureWorkbookSetup,
  getAllEquipmentData,
  getAvailableEquipmentData,
  updateEquipment,
} from "@/lib/google-sheets"

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
    const body = await request.json()
    const equipment = await appendEquipment(body)

    return NextResponse.json({ success: true, equipment }, { status: 201 })
  } catch (error) {
    console.error("Error creating equipment:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create equipment",
      },
      { status: 400 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const equipmentId = String(body.id || "").trim()

    if (!equipmentId) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอุปกรณ์" },
        { status: 400 }
      )
    }

    const equipment = await updateEquipment(equipmentId, body)

    return NextResponse.json({ success: true, equipment })
  } catch (error) {
    console.error("Error updating equipment:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update equipment",
      },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get("id")?.trim()

    if (!equipmentId) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอุปกรณ์" },
        { status: 400 }
      )
    }

    await deleteEquipment(equipmentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting equipment:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete equipment",
      },
      { status: 400 }
    )
  }
}
