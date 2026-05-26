import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 28,
});

/**
 * Add two monetary values safely.
 */
export function add(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return new Decimal(a).add(new Decimal(b));
}

/**
 * Subtract b from a safely.
 */
export function subtract(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return new Decimal(a).sub(new Decimal(b));
}

/**
 * Multiply two values safely.
 */
export function multiply(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return new Decimal(a).mul(new Decimal(b));
}

/**
 * Divide a by b safely.
 */
export function divide(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  const divisor = new Decimal(b);
  if (divisor.isZero()) throw new Error('Division by zero');
  return new Decimal(a).div(divisor);
}

/**
 * Round to 2 decimal places (standard currency rounding).
 */
export function roundMoney(value: string | number | Decimal): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Format as KES currency string: "KES 1,234.56"
 */
export function formatKES(value: string | number | Decimal): string {
  const rounded = roundMoney(value);
  return `KES ${rounded.toNumber().toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculate weekly installment for a loan.
 * installment = (principal + totalInterest) / numberOfWeeks
 */
export function calculateWeeklyInstallment(
  principal: Decimal,
  interestRate: Decimal,
  numberOfWeeks: number,
): { weeklyInstallment: Decimal; totalInterest: Decimal; totalAmount: Decimal } {
  const totalInterest = multiply(principal, interestRate);
  const totalAmount = add(principal, totalInterest);
  const weeklyInstallment = roundMoney(divide(totalAmount, numberOfWeeks));
  return { weeklyInstallment, totalInterest: roundMoney(totalInterest), totalAmount: roundMoney(totalAmount) };
}

/**
 * Calculate daily flat penalty.
 */
export function calculateFlatPenalty(amountPerDay: Decimal, daysOverdue: number): Decimal {
  return roundMoney(multiply(amountPerDay, daysOverdue));
}

/**
 * Calculate percentage-based penalty.
 */
export function calculatePercentagePenalty(
  outstandingBalance: Decimal,
  penaltyPercentage: Decimal,
  daysOverdue: number,
): Decimal {
  return roundMoney(multiply(multiply(outstandingBalance, penaltyPercentage), daysOverdue));
}

export { Decimal };
