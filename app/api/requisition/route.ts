import { NextResponse } from 'next/server'
import { getEquipmentData, appendRequisition, updateStock } from '@/lib/google-sheets'
import { toBaseUnit } from '@/lib/unit-conversion'
import { formatThaiDate } from '@/lib/date-format'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, department, items } = body

    // Validate input
    if (!name || !department || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Fetch latest equipment data for concurrency check
    const equipmentData = await getEquipmentData()
    const equipmentMap = new Map(equipmentData.map(eq => [eq.id, eq]))
    const normalizedEquipmentMap = new Map(
      equipmentData.map(eq => [eq.id.toLowerCase(), eq])
    )

    // Generate requisition number
    const requisitionNumber = `REQ${Date.now()}`

    // Check stock availability and calculate deductions
    const stockUpdates: any[] = []
    const historyRows: any[] = []
    const currentDate = new Date()

    for (const item of items) {
      const requestedEquipmentId = String(item.equipmentId || "").trim()
      const equipment =
        equipmentMap.get(requestedEquipmentId) ||
        normalizedEquipmentMap.get(requestedEquipmentId.toLowerCase())
      
      if (!equipment) {
        return NextResponse.json(
          { error: `ไม่พบอุปกรณ์รหัส ${requestedEquipmentId}` },
          { status: 404 }
        )
      }

      // Convert to base units
      const amountInBaseUnits = toBaseUnit(item.amount, item.isMainUnit, equipment.ratio)

      // Check if enough stock
      if (amountInBaseUnits > equipment.remaining) {
        return NextResponse.json(
          { error: `Not enough stock for ${equipment.name}. Available: ${equipment.remaining} ${equipment.baseUnit}` },
          { status: 400 }
        )
      }

      // Calculate new stock values
      const newUsed = equipment.used + amountInBaseUnits
      const newRemaining = equipment.remaining - amountInBaseUnits

      // Prepare stock update
      const rowIndex = equipmentData.findIndex(eq => eq.id === equipment.id) + 2 // +2 for header and 1-based index
      stockUpdates.push({
        range: `สต๊อกอุปกรณ์!E${rowIndex}:F${rowIndex}`,
        values: [[newUsed, newRemaining]],
      })

      // Prepare history row
      // Columns: เลขที่ใบเบิก, วันที่เบิก, ชื่อ-นามสกุล, แผนก, ชื่ออุปกรณ์, จำนวนที่เบิก, หน่วยที่เบิก
      const unitDisplay = item.isMainUnit && equipment.mainUnit 
        ? `${item.amount} ${equipment.mainUnit}`
        : `${item.amount} ${equipment.baseUnit}`
      
      historyRows.push([
        requisitionNumber,
        formatThaiDate(currentDate),
        name,
        department,
        equipment.name,
        item.amount,
        item.isMainUnit && equipment.mainUnit ? equipment.mainUnit : equipment.baseUnit,
      ])
    }

    // Execute updates
    await updateStock(stockUpdates)
    await appendRequisition(historyRows)

    return NextResponse.json({
      success: true,
      requisitionNumber,
      message: 'Requisition submitted successfully',
    })
  } catch (error) {
    console.error('Error processing requisition:', error)
    return NextResponse.json(
      { error: 'Failed to process requisition' },
      { status: 500 }
    )
  }
}
