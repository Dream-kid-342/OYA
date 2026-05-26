/**
 * Date utility functions for loan calculations.
 */

/**
 * Add N weeks to a date.
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Get difference in days between two dates.
 */
export function daysDiff(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Return today as a Date with time zeroed (EAT UTC+3).
 */
export function todayEAT(): Date {
  const now = new Date();
  // EAT = UTC + 3
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  eat.setUTCHours(0, 0, 0, 0);
  return eat;
}

/**
 * Format a date as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
