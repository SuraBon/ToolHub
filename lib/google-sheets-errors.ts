export const GOOGLE_SHEETS_QUOTA_MESSAGE =
  "มีการใช้งาน Google Sheets ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่"

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function isGoogleSheetsQuotaError(error: unknown) {
  const message = stringifyError(error).toLowerCase()

  return (
    message.includes("429") ||
    message.includes("quota exceeded") ||
    message.includes("read requests per minute") ||
    message.includes("write requests per minute") ||
    (message.includes("sheets.googleapis.com") && message.includes("quota"))
  )
}
