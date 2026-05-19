/**
 * Format total base units into main unit and sub unit string
 * Example: formatUnit(83, "รีม", "ลัง", 10) => "8 ลัง 3 รีม"
 */
export function formatUnit(
  totalBase: number,
  baseUnit: string,
  mainUnit?: string,
  ratio?: number
): string {
  if (!mainUnit || !ratio) {
    return `${totalBase} ${baseUnit}`
  }

  const mainUnits = Math.floor(totalBase / ratio)
  const remainingBase = totalBase % ratio

  if (mainUnits === 0) {
    return `${totalBase} ${baseUnit}`
  }

  if (remainingBase === 0) {
    return `${mainUnits} ${mainUnit}`
  }

  return `${mainUnits} ${mainUnit} ${remainingBase} ${baseUnit}`
}

/**
 * Convert amount to base units
 * Example: toBaseUnit(8, true, 10) => 80 (8 main units to base units)
 * Example: toBaseUnit(3, false, 10) => 3 (3 base units)
 */
export function toBaseUnit(
  amount: number,
  isMainUnit: boolean,
  ratio?: number
): number {
  if (!isMainUnit || !ratio) {
    return amount
  }
  return amount * ratio
}
