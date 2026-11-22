/**
 * Issue #215: the rules behind the month calendar in the guides (Ny träning, Ny match).
 * Pure functions: "today" is always passed in, never read from the clock.
 * Days are local calendar dates ("2026-11-22"), like `lib/dates.ts`, so time zones
 * and daylight saving time cannot move a day.
 */

/** A month on screen. `month` is 0–11, like `Date.getMonth()`. */
export type Month = { year: number; month: number };

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Mars',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'Augusti',
  'September',
  'Oktober',
  'November',
  'December',
];

/** Column headings. Weeks start on Monday. */
export const WEEKDAY_SHORT = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'];

/** Full names, indexed like `Date.getDay()` (Sunday = 0). For screen readers. */
const WEEKDAY_FULL = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

/**
 * The weeks of a month, Monday first. Each week has seven cells:
 * a day number, or null for a cell before day 1 or after the last day.
 */
export function monthWeeks(year: number, month: number): (number | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const cells: (number | null)[] = Array.from({ length: lead }, () => null);
  const days = daysInMonth(year, month);
  for (let day = 1; day <= days; day++) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function addMonths(from: Month, delta: number): Month {
  const index = from.year * 12 + from.month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

export function monthOf(day: Date): Month {
  return { year: day.getFullYear(), month: day.getMonth() };
}

/** False on the month of today: every earlier month has only past days. */
export function canGoToPreviousMonth(view: Month, today: Date): boolean {
  const now = monthOf(today);
  return view.year * 12 + view.month > now.year * 12 + now.month;
}

/** "November 2026" */
export function monthTitle(view: Month): string {
  return `${MONTH_NAMES[view.month]} ${view.year}`;
}

/** "2026-11-22" */
export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * True for a day before today. Today itself is not past, even late in the evening.
 * Text that is not a date counts as past, so it can never be chosen.
 */
export function isPastDay(key: string, today: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return true;
  }
  return key < dayKey(today.getFullYear(), today.getMonth(), today.getDate());
}

/** "söndag 22 november 2026" */
export function dayAccessibilityLabel(key: string): string {
  const d = parseDayKey(key);
  if (!d) {
    return key;
  }
  return `${WEEKDAY_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}
