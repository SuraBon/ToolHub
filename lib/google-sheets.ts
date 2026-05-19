import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

export async function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    SCOPES
  )
  
  await auth.authorize()
  return google.sheets({ version: 'v4', auth })
}

export async function getEquipmentData() {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'สต๊อกอุปกรณ์!A2:I',
  })
  
  const rows = response.data.values || []
  
  // Map rows to objects
  // Columns: รหัสอุปกรณ์, รูปภาพ, ชื่ออุปกรณ์, สต๊อกรวม(หน่วยย่อย), ใช้ไป(หน่วยย่อย), คงเหลือ(หน่วยย่อย), หน่วยย่อย, หน่วยใหญ่, อัตราส่วน
  return rows.map((row, index) => ({
    id: row[0] || `EQ${String(index + 1).padStart(3, '0')}`,
    image: row[1] || '',
    name: row[2] || '',
    totalStock: parseInt(row[3]) || 0,
    used: parseInt(row[4]) || 0,
    remaining: parseInt(row[5]) || 0,
    baseUnit: row[6] || '',
    mainUnit: row[7] || '',
    ratio: row[8] ? parseInt(row[8]) : undefined,
  }))
}

export async function appendRequisition(data: any[]) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID
  
  // Columns: เลขที่ใบเบิก, วันที่เบิก, ชื่อ-นามสกุล, แผนก, ชื่ออุปกรณ์, จำนวนที่เบิก, หน่วยที่เบิก
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'ประวัติการเบิก!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: data,
    },
  })
}

export async function updateStock(updates: any[]) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID
  
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates.map(update => ({
        range: update.range,
        values: update.values,
      })),
    },
  })
}

export async function autoFillSampleData() {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.SPREADSHEET_ID
  
  // Check if stock sheet is empty
  const stockResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'สต๊อกอุปกรณ์!A2:I2',
  })
  
  if (stockResponse.data.values && stockResponse.data.values.length > 0) {
    return // Data already exists
  }
  
  // Auto-fill sample equipment data
  const sampleEquipment = [
    ['EQ001', '', 'กระดาษ A4', 5000, 0, 5000, 'แผ่น', 'รีม', 500],
    ['EQ002', '', 'ปากกาลูกลื่น', 1000, 0, 1000, 'แท่ง', 'กล่อง', 12],
    ['EQ003', '', 'ไม้บรรทัด', 200, 0, 200, 'เส้น', 'แพ็ค', 10],
    ['EQ004', '', 'สมุดจดบันทึก', 500, 0, 500, 'เล่ม', 'แพ็ค', 10],
    ['EQ005', '', 'กล่องไฟล์', 300, 0, 300, 'กล่อง', 'แพ็ค', 10],
  ]
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'สต๊อกอุปกรณ์!A2:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: sampleEquipment,
    },
  })
}
