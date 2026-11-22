import {
  addMonths,
  canGoToPreviousMonth,
  dayAccessibilityLabel,
  dayKey,
  daysInMonth,
  isPastDay,
  monthOf,
  monthTitle,
  monthWeeks,
  WEEKDAY_SHORT,
} from './calendar';

// "Today" is always injected. 22 Nov 2026 is a Sunday, 17:45 local time.
const today = new Date(2026, 10, 22, 17, 45);

describe('monthWeeks', () => {
  test('weeks start on Monday and every week has seven cells', () => {
    const weeks = monthWeeks(2026, 2); // March 2026 starts on a Sunday
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    expect(WEEKDAY_SHORT).toEqual(['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön']);
  });

  test('a month that starts on Sunday puts day 1 in the last column', () => {
    const weeks = monthWeeks(2026, 10); // November 2026, 1 Nov is a Sunday
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks[1]).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(weeks).toHaveLength(6);
    expect(weeks[5]).toEqual([30, null, null, null, null, null, null]);
  });

  test('a month that starts on Monday has no empty cells before day 1', () => {
    const weeks = monthWeeks(2027, 1); // February 2027: starts Monday, 28 days
    expect(weeks).toHaveLength(4);
    expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks[3]).toEqual([22, 23, 24, 25, 26, 27, 28]);
  });

  test('lists every day of the month exactly once, in order', () => {
    const days = monthWeeks(2026, 11).flat().filter((d) => d !== null);
    expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  test('leap year February has 29 days, other years 28', () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2100, 1)).toBe(28); // divisible by 100, not by 400
    expect(daysInMonth(2000, 1)).toBe(29);

    const leap = monthWeeks(2028, 1).flat().filter((d) => d !== null);
    expect(leap.at(-1)).toBe(29);
  });
});

describe('moving between months', () => {
  test('crosses the year boundary forwards and backwards', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2027, month: 0 }, -1)).toEqual({ year: 2026, month: 11 });
    expect(addMonths({ year: 2026, month: 10 }, 14)).toEqual({ year: 2028, month: 0 });
  });

  test('starts on the month of today', () => {
    expect(monthOf(today)).toEqual({ year: 2026, month: 10 });
  });

  test('cannot go back to a month before the current one', () => {
    expect(canGoToPreviousMonth({ year: 2026, month: 10 }, today)).toBe(false);
    expect(canGoToPreviousMonth({ year: 2026, month: 11 }, today)).toBe(true);
    expect(canGoToPreviousMonth({ year: 2027, month: 0 }, today)).toBe(true);
  });

  test('month title is in Swedish', () => {
    expect(monthTitle({ year: 2026, month: 10 })).toBe('November 2026');
    expect(monthTitle({ year: 2027, month: 0 })).toBe('Januari 2027');
  });
});

describe('isPastDay', () => {
  test('yesterday is past, today and tomorrow are not', () => {
    expect(isPastDay('2026-11-21', today)).toBe(true);
    expect(isPastDay('2026-11-22', today)).toBe(false);
    expect(isPastDay('2026-11-23', today)).toBe(false);
  });

  test('today counts as not past even late in the evening', () => {
    expect(isPastDay('2026-11-22', new Date(2026, 10, 22, 23, 59))).toBe(false);
  });

  test('works across month and year boundaries', () => {
    const newYear = new Date(2027, 0, 1, 0, 5);
    expect(isPastDay('2026-12-31', newYear)).toBe(true);
    expect(isPastDay('2027-01-01', newYear)).toBe(false);
    expect(isPastDay('2026-10-31', today)).toBe(true);
    expect(isPastDay('2026-12-01', today)).toBe(false);
  });

  test('text that is not a date counts as past, so it can never be chosen', () => {
    expect(isPastDay('not a date', today)).toBe(true);
  });
});

describe('day keys and labels', () => {
  test('dayKey pads month and day', () => {
    expect(dayKey(2027, 0, 5)).toBe('2027-01-05');
    expect(dayKey(2026, 11, 31)).toBe('2026-12-31');
  });

  test('screen reader label names weekday, day, month and year in Swedish', () => {
    expect(dayAccessibilityLabel('2026-11-22')).toBe('söndag 22 november 2026');
    expect(dayAccessibilityLabel('2026-11-23')).toBe('måndag 23 november 2026');
  });
});
