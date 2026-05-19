import { format } from "date-fns"
import { th } from "date-fns/locale"

/**
 * Format date to Thai format with Buddhist era
 * Example: formatThaiDate(new Date(2026, 2, 12)) => "12 มีนาคม 2569"
 */
export function formatThaiDate(date: Date): string {
  const buddhistYear = date.getFullYear() + 543
  const monthName = format(date, "MMMM", { locale: th })
  const day = format(date, "d", { locale: th })
  
  return `${day} ${monthName} ${buddhistYear}`
}
