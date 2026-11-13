import type { Weekday } from '../../api/trainings';

/**
 * Issue #132: "Upprepa varje vecka" on "Ny träning".
 * The app counts the trainings itself, with the same rule as the API (#129):
 * every date from fromDate to toDate (both included) whose weekday is chosen,
 * except dates whose start time has already passed. The API decides in the end.
 */

/** The API says no (400) to a series with more trainings than this. */
export const MAX_SERIES_TRAININGS = 60;

/** Monday first, as on a Swedish calendar. */
export const WEEKDAYS: readonly { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'Mån' },
  { value: 'TUESDAY', label: 'Tis' },
  { value: 'WEDNESDAY', label: 'Ons' },
  { value: 'THURSDAY', label: 'Tor' },
  { value: 'FRIDAY', label: 'Fre' },
  { value: 'SATURDAY', label: 'Lör' },
  { value: 'SUNDAY', label: 'Sön' },
];

/** Date.getDay() gives 0 for Sunday, 1 for Monday and so on. */
const BY_JS_DAY: Weekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/** "2026-11-12" as a local date at midnight, or null when it is not a date like that. */
function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** "17:30" as [17, 30], or null. */
function parseTime(value: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * How many trainings the series would create.
 * Counting stops at MAX_SERIES_TRAININGS + 1, so a typo like year 9999 stays fast.
 * Anything above the max only means "too many".
 * Bad input (no date, end before start, no weekday) gives 0.
 */
export function countSeriesTrainings(
  series: { fromDate: string; toDate: string; weekdays: readonly Weekday[]; startTime: string },
  now: Date = new Date(),
): number {
  const from = parseDate(series.fromDate);
  const to = parseDate(series.toDate);
  const time = parseTime(series.startTime);
  if (!from || !to || !time || series.weekdays.length === 0) {
    return 0;
  }
  let count = 0;
  for (const day = from; day <= to; day.setDate(day.getDate() + 1)) {
    if (!series.weekdays.includes(BY_JS_DAY[day.getDay()])) {
      continue;
    }
    const startsAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), time[0], time[1]);
    if (startsAt.getTime() < now.getTime()) {
      continue;
    }
    count += 1;
    if (count > MAX_SERIES_TRAININGS) {
      break;
    }
  }
  return count;
}

/** "1 träning skapas", "8 träningar skapas". */
export function seriesCountText(count: number): string {
  return count === 1 ? '1 träning skapas' : `${count} träningar skapas`;
}

export const TOO_MANY_MESSAGE = `Högst ${MAX_SERIES_TRAININGS} träningar åt gången. Välj ett tidigare slutdatum eller färre dagar.`;

export const NONE_CREATED_MESSAGE = 'Inga träningar skapades, alla datum har passerat.';
