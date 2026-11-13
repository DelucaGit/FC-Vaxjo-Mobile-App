import {
  activityDateLabel,
  dayLabel,
  isoWeek,
  lockedLabel,
  stampLabel,
  toDate,
  weekLabel,
} from './dates';

describe('date labels', () => {
  test('day label uses Swedish short day and month', () => {
    expect(dayLabel('2026-11-10T15:00:00')).toBe('Tis 10 nov');
    expect(dayLabel('2026-05-03')).toBe('Sön 3 maj');
  });

  test('training date row has start and end', () => {
    expect(activityDateLabel('2026-11-12T17:30:00', '2026-11-12T19:00:00')).toBe(
      'Tor 12 nov · 17:30–19:00',
    );
  });

  test('match date row has only kick-off', () => {
    expect(activityDateLabel('2026-11-14T10:00:00')).toBe('Lör 14 nov · 10:00');
  });

  test('stamp and locked label', () => {
    expect(stampLabel('2026-11-12T19:05:00')).toBe('12 nov 19:05');
    expect(lockedLabel(new Date(2026, 10, 12, 19, 5))).toBe('Låst 12 nov 19:05');
  });

  test('date-only string is local midnight, not the day before', () => {
    const d = toDate('2026-01-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getDate()).toBe(1);
  });

  test('ISO week numbers', () => {
    expect(weekLabel('2026-11-10')).toBe('Vecka 46');
    // Monday starts the week, Sunday ends it.
    expect(isoWeek('2026-11-09')).toBe(46);
    expect(isoWeek('2026-11-15')).toBe(46);
    expect(isoWeek('2026-11-16')).toBe(47);
    // Year boundaries: 1 Jan 2027 is a Friday, so it belongs to week 53 of 2026.
    expect(isoWeek('2027-01-01')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
    // 29 Dec 2025 is a Monday in week 1 of 2026.
    expect(isoWeek('2025-12-29')).toBe(1);
  });
});
