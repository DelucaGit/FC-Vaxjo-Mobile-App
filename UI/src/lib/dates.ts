/**
 * Swedish date labels from the design spec (section 5, "Datumformat").
 * Pure functions: same input, same output, no clock and no locale settings.
 *
 * Input is a Date or the API's local date-time string ("2026-11-12T17:30:00").
 * A date-only string ("2026-11-12") is read as local midnight, not UTC midnight,
 * so it never slides to the day before.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const DAYS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

export type DateInput = Date | string;

export function toDate(value: DateInput): Date {
  if (value instanceof Date) {
    return value;
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "17:30" */
export function timeLabel(value: DateInput): string {
  const d = toDate(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Tis 12 nov" */
export function dayLabel(value: DateInput): string {
  const d = toDate(value);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * The date row on an activity.
 * Training (start and end): "Tis 12 nov · 17:30–19:00".
 * Match (start only): "Tis 12 nov · 10:00".
 */
export function activityDateLabel(start: DateInput, end?: DateInput | null): string {
  const times = end ? `${timeLabel(start)}–${timeLabel(end)}` : timeLabel(start);
  return `${dayLabel(start)} · ${times}`;
}

/** "12 nov 19:05" */
export function stampLabel(value: DateInput): string {
  const d = toDate(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${timeLabel(d)}`;
}

/** "Låst 12 nov 19:05" */
export function lockedLabel(value: DateInput): string {
  return `Låst ${stampLabel(value)}`;
}

/** ISO 8601 week number: weeks start on Monday, week 1 holds the first Thursday. */
export function isoWeek(value: DateInput): number {
  const d = toDate(value);
  // Work in UTC on the calendar date so daylight saving time cannot shift the day.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayOfWeek = date.getUTCDay() || 7; // Sunday = 7
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek); // Thursday of this week
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** "Vecka 46" */
export function weekLabel(value: DateInput): string {
  return `Vecka ${isoWeek(value)}`;
}
