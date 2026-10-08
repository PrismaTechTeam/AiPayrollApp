/**
 * The calendar the payroll runs on: Malaysia, UTC+8, no daylight saving, whatever zone the
 * phone is set to. Month names are written out rather than asked of the phone, because
 * toLocaleDateString printed "Sep 4, 2026" on an English (US) Android phone and "4 Sept 2026"
 * on a newer en-GB one, so the same date read differently across handsets.
 *
 * The request and leave kits each carried their own copy of these; one copy now.
 */

export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** The same instant shifted so its getUTC* parts read as the wall clock in Malaysia. */
export function inMalaysia(d: Date): Date {
  return new Date(d.getTime() + MYT_OFFSET_MS);
}

/** Days since 1970 of the Malaysian calendar date an instant falls on, for counting whole days. */
export function malaysianDayNumber(ms: number): number {
  return Math.floor((ms + MYT_OFFSET_MS) / DAY_MS);
}

/** Today in Malaysia as YYYY-MM-DD. */
export function todayInMalaysia(): string {
  return new Date(Date.now() + MYT_OFFSET_MS).toISOString().slice(0, 10);
}
