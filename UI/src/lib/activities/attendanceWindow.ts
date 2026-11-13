/**
 * Issue #124: attendance (marking and "Klar") opens 30 minutes before start.
 * The API has the same rule and is the one that really decides. The app only
 * hides the buttons early, so a coach does not tap something that ends in a 400.
 *
 * "Now" is the phone's own clock and time zone, like isPastStart in startTime.ts.
 */

export const ATTENDANCE_OPENS_MINUTES_BEFORE_START = 30;

export const ATTENDANCE_NOT_OPEN_MESSAGE = 'Närvaro öppnar 30 min före start';

/**
 * True when now is at or after 30 minutes before the local "2026-11-12T17:30:00".
 * Text that is not a date-time gives true, so the API makes the call instead.
 */
export function isAttendanceOpen(startsAt: string, now: number = Date.now()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(startsAt);
  if (!m) {
    return true;
  }
  const start = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  const opensAt = start.getTime() - ATTENDANCE_OPENS_MINUTES_BEFORE_START * 60 * 1000;
  return now >= opensAt;
}
