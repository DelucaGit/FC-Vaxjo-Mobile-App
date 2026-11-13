/**
 * Turns the two text fields "Datum" (ÅÅÅÅ-MM-DD) and "Avspark" (TT:MM) into the
 * local "yyyy-MM-ddTHH:mm:ss" string the API wants. Returns null when either is
 * not a real date or time, so the screen can keep "Spara" locked.
 */
export function toKickoffAt(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) {
    return null;
  }
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [hour, minute] = [Number(t[1]), Number(t[2])];
  // new Date rolls 2026-02-31 over to March, so a mismatch means the day does not exist.
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return null;
  }
  if (hour > 23 || minute > 59) {
    return null;
  }
  return `${d[1]}-${d[2]}-${d[3]}T${String(hour).padStart(2, '0')}:${t[2]}:00`;
}

/** "3" -> 3. Empty, negative or not a whole number -> null. */
export function toGoals(text: string): number | null {
  const trimmed = text.trim();
  return /^\d{1,3}$/.test(trimmed) ? Number(trimmed) : null;
}
