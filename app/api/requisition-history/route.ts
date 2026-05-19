import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    )
    
    await auth.authorize()
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.SPREADSHEET_ID
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ประวัติการเบิก!A2:G',
    })
    
    const rows = response.data.values || []
    
    // Columns: เลขที่ใบเบิก, วันที่เบิก, ชื่อ-นามสกุล, แผนก, ชื่ออุปกรณ์, จำนวนที่เบิก, หน่วยที่เบิก
    const history = rows.map(row => ({
      requisitionNumber: row[0] || '',
      date: row[1] || '',
      name: row[2] || '',
      department: row[3] || '',
      equipmentName: row[4] || '',
      amount: row[5] || '',
      unit: row[6] || '',
    }))
    
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching requisition history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requisition history' },
      { status: 500 }
    )
  }
}
