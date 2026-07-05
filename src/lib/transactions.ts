/** Only include charge rows (credits/payments are negative on statements). */
export const POSITIVE_CHARGE_FILTER = { amount: { gt: 0 } } as const;

export function isPositiveCharge(amount: number): boolean {
  return amount > 0;
}
