/**
 * Issue #215: the rules behind the time wheel in the guides (Ny träning, Ny match).
 * Pure functions. A time is local "HH:MM" text, like the time part of the API's
 * "2026-11-12T17:30:00", so no clock and no time zone is involved.
 *
 * Snapping rule: a minute that is not on the wheel is rounded DOWN to the five
 * minutes before (10:03 -> 10:00, 23:59 -> 23:55). It never moves to the next
 * hour or the next day.
 */

export const MINUTE_STEP = 5;

/** 0–23 */
export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, i) => i);

/** 0, 5 … 55 */
export const MINUTES: readonly number[] = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

export const END_BEFORE_START_MESSAGE = 'Sluttiden måste vara efter starttiden';

type Clock = { hour: number; minute: number };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parse(text: string): Clock | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(text);
  if (!m) {
    return null;
  }
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function format(hour: number, minute: number): string {
  const snapped = Math.floor(minute / MINUTE_STEP) * MINUTE_STEP;
  return `${pad(hour)}:${pad(snapped)}`;
}

/** "10:03" -> "10:00". Text that is not a time gives null. */
export function snapTime(text: string): string | null {
  const t = parse(text);
  return t ? format(t.hour, t.minute) : null;
}

/** New hour, same minute. A time that cannot be read starts from 00:00. */
export function withHour(text: string, hour: number): string {
  const t = parse(text) ?? { hour: 0, minute: 0 };
  return format(Math.min(23, Math.max(0, hour)), t.minute);
}

/** New minute (snapped down), same hour. */
export function withMinute(text: string, minute: number): string {
  const t = parse(text) ?? { hour: 0, minute: 0 };
  return format(t.hour, Math.min(59, Math.max(0, minute)));
}

function minutesOfDay(text: string): number | null {
  const t = parse(text);
  return t ? t.hour * 60 + t.minute : null;
}

/** True only when end is strictly after start on the same day. Equal is rejected. */
export function isEndAfterStart(start: string, end: string): boolean {
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  return s !== null && e !== null && e > s;
}

/** The wheel row at a scroll position, kept inside the list. */
export function indexFromOffset(offsetY: number, itemHeight: number, count: number): number {
  const index = Math.round(offsetY / itemHeight);
  return Math.min(count - 1, Math.max(0, index));
}
