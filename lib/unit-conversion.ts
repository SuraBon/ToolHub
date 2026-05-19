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
