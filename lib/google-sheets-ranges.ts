export const STOCK_SHEET_NAME = "สต๊อกอุปกรณ์"
export const HISTORY_SHEET_NAME = "ประวัติการเบิก"
export const AUDIT_LOG_SHEET_NAME = "บันทึกการจัดการ"

export const STOCK_HEADERS = [
  "รหัสอุปกรณ์",
  "รูปภาพ",
  "ชื่ออุปกรณ์",
  "สต๊อกรวม(หน่วยย่อย)",
  "ใช้ไป(หน่วยย่อย)",
  "คงเหลือ(หน่วยย่อย)",
  "หน่วยย่อย",
  "หน่วยใหญ่",
  "อัตราส่วน",
]

export const HISTORY_HEADERS = [
  "เลขที่ใบเบิก",
  "วันที่เบิก",
  "ชื่อ-นามสกุล",
  "แผนก",
  "ชื่ออุปกรณ์",
  "จำนวนที่เบิก",
  "หน่วยที่เบิก",
]

export const AUDIT_LOG_HEADERS = [
  "เวลา",
  "ประเภทเหตุการณ์",
  "รายละเอียด",
  "รหัสอุปกรณ์",
  "ชื่ออุปกรณ์",
]

function columnLetter(columnCount: number) {
  return String.fromCharCode("A".charCodeAt(0) + columnCount - 1)
}

export function headerRange(sheetName: string, headerCount: number) {
  return `${sheetName}!A1:${columnLetter(headerCount)}1`
}

export function stockReadRange() {
  return `${STOCK_SHEET_NAME}!A2:I`
}

export function stockAppendRange() {
  return `${STOCK_SHEET_NAME}!A:I`
}

export function stockRowRange(rowIndex: number) {
  return `${STOCK_SHEET_NAME}!A${rowIndex}:I${rowIndex}`
}

export function stockUsageRange(rowIndex: number) {
  return `${STOCK_SHEET_NAME}!E${rowIndex}:F${rowIndex}`
}

export function historyReadRange() {
  return `${HISTORY_SHEET_NAME}!A2:G`
}

export function historyAppendRange() {
  return `${HISTORY_SHEET_NAME}!A:G`
}

export function auditLogAppendRange() {
  return `${AUDIT_LOG_SHEET_NAME}!A:E`
}
