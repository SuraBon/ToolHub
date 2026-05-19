import { NextResponse } from 'next/server'
import { getEquipmentData, autoFillSampleData } from '@/lib/google-sheets'

export async function GET() {
  try {
    // Auto-fill sample data if sheet is empty
    await autoFillSampleData()
    
    const equipment = await getEquipmentData()
    
    // Filter out items with zero remaining stock
    const availableEquipment = equipment.filter(item => item.remaining > 0)
    
    return NextResponse.json(availableEquipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment data' },
      { status: 500 }
    )
  }
}
