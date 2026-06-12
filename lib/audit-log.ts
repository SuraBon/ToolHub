type AuditLogEvent = {
  action: string
  detail: string
  equipmentId?: string
  equipmentName?: string
}

export type AdminAuditLog = {
  rowNumber: number
  timestamp: string
  action: string
  detail: string
  equipmentId: string
  equipmentName: string
}

export async function logAdminEvent(event: AuditLogEvent) {
  // เลิกการเก็บ Log ลง Google Sheets ตามความต้องการของนักพัฒนา
  // เพื่อประหยัด Google Sheets API quota และป้องกัน DoS
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Audit Log] Action: ${event.action} | Detail: ${event.detail}`);
  }
}

export async function getAdminAuditLogs(_limit = 200): Promise<AdminAuditLog[]> {
  // ส่งคืนอาเรย์ว่างเนื่องจากไม่มีการเก็บบันทึก Log แล้ว
  return []
}
