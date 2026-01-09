export interface DenominationBreakdown {
  denomination: number;
  count: number;
  type: 'billete' | 'moneda';
}

// Chilean currency denominations (from largest to smallest)
const CHILEAN_DENOMINATIONS = [
  { value: 20000, type: 'billete' as const },
  { value: 10000, type: 'billete' as const },
  { value: 5000, type: 'billete' as const },
  { value: 2000, type: 'billete' as const },
  { value: 1000, type: 'billete' as const },
  { value: 500, type: 'moneda' as const },
  { value: 100, type: 'moneda' as const },
  { value: 50, type: 'moneda' as const },
  { value: 10, type: 'moneda' as const },
];

/**
 * Calculate the breakdown of change into Chilean bills and coins
 * Uses a greedy algorithm to minimize the number of bills/coins
 */
export function calculateChangeBreakdown(amount: number): DenominationBreakdown[] {
  if (amount <= 0) return [];

  // Round to nearest 10 (smallest denomination)
  let remaining = Math.round(amount / 10) * 10;
  const breakdown: DenominationBreakdown[] = [];

  for (const { value, type } of CHILEAN_DENOMINATIONS) {
    if (remaining >= value) {
      const count = Math.floor(remaining / value);
      breakdown.push({
        denomination: value,
        count,
        type,
      });
      remaining -= count * value;
    }
  }

  return breakdown;
}

/**
 * Format a denomination value as currency string
 */
export function formatDenomination(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toLocaleString('es-CL')}k`;
  }
  return `$${value.toLocaleString('es-CL')}`;
}

/**
 * Format the breakdown as a readable string
 */
export function formatBreakdownSummary(breakdown: DenominationBreakdown[]): string {
  return breakdown
    .map(({ denomination, count }) => `${count}x $${denomination.toLocaleString('es-CL')}`)
    .join(', ');
}
