import { isAttendanceOpen } from './attendanceWindow';

/** Local time, the same way the app reads the API's date-time strings. */
function at(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

describe('isAttendanceOpen', () => {
  const start = '2026-11-12T17:30:00';

  test('is closed 31 minutes before start', () => {
    expect(isAttendanceOpen(start, at(2026, 11, 12, 16, 59))).toBe(false);
  });

  test('is closed days before start', () => {
    expect(isAttendanceOpen(start, at(2026, 11, 10, 18, 0))).toBe(false);
  });

  test('opens exactly 30 minutes before start', () => {
    expect(isAttendanceOpen(start, at(2026, 11, 12, 17, 0))).toBe(true);
  });

  test('is open during and after the activity', () => {
    expect(isAttendanceOpen(start, at(2026, 11, 12, 18, 0))).toBe(true);
    expect(isAttendanceOpen(start, at(2026, 11, 13, 0, 30))).toBe(true);
  });

  test('text that is not a date-time leaves the decision to the API', () => {
    expect(isAttendanceOpen('', at(2026, 11, 12, 12, 0))).toBe(true);
  });
});
