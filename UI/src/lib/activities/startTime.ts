/**
 * Issue #115: a training or match may not start at a time that has already passed.
 * The API has the same rule and is the one that really decides. The app only
 * locks "Spara" early, so a coach does not fill in a form that ends in a 400.
 *
 * "Now" is the phone's own clock and time zone. For the club's phones that is
 * Swedish time. A phone set to another zone may let a few hours through, and
 * then the API says no with its Swedish message instead.
 */

export const PAST_START_MESSAGE = 'Tiden har redan passerat. Välj en tid som inte har varit.';

/**
 * True when the local "2026-11-12T17:30:00" is before now.
 * The string is read as the phone's local time, never as UTC.
 * Text that is not a date-time gives false, so other checks handle it.
 */
export function isPastStart(startsAt: string, now: Date = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(startsAt);
  if (!m) {
    return false;
  }
  const start = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  return start.getTime() < now.getTime();
}
