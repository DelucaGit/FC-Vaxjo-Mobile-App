import { MAX_SERIES_TRAININGS, countSeriesTrainings, seriesCountText } from './trainingSeries';

describe('countSeriesTrainings', () => {
  // Wednesday 11 Nov 2026, 13:00 on the phone's clock.
  const now = new Date(2026, 10, 11, 13, 0);
  const base = {
    fromDate: '2026-11-16', // a Monday
    toDate: '2026-11-29', // a Sunday, two weeks later
    weekdays: ['MONDAY', 'WEDNESDAY'] as const,
    startTime: '17:30',
  };

  test('counts the chosen weekdays in the range, both ends included', () => {
    expect(countSeriesTrainings(base, now)).toBe(4);
    expect(countSeriesTrainings({ ...base, toDate: '2026-11-16' }, now)).toBe(1);
    expect(countSeriesTrainings({ ...base, weekdays: ['SUNDAY'] }, now)).toBe(2);
  });

  test('all seven days counts every date', () => {
    const all = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
    expect(countSeriesTrainings({ ...base, weekdays: all }, now)).toBe(14);
  });

  test('skips dates that have passed, including today when the time has gone', () => {
    // Mon 9, Wed 11 (13:00 now) and Mon 16, Wed 18.
    const range = { ...base, fromDate: '2026-11-09', toDate: '2026-11-18' };
    expect(countSeriesTrainings({ ...range, startTime: '12:00' }, now)).toBe(2);
    expect(countSeriesTrainings({ ...range, startTime: '17:30' }, now)).toBe(3);
  });

  test('is 0 for bad input', () => {
    expect(countSeriesTrainings({ ...base, weekdays: [] }, now)).toBe(0);
    expect(countSeriesTrainings({ ...base, toDate: '2026-11-15' }, now)).toBe(0);
    expect(countSeriesTrainings({ ...base, toDate: '' }, now)).toBe(0);
    expect(countSeriesTrainings({ ...base, startTime: 'x' }, now)).toBe(0);
  });

  test('crosses month and year ends', () => {
    // Every Thursday from 2026-12-24 to 2027-01-14: 24, 31, 7, 14.
    expect(
      countSeriesTrainings(
        { ...base, fromDate: '2026-12-24', toDate: '2027-01-14', weekdays: ['THURSDAY'] },
        now,
      ),
    ).toBe(4);
  });

  test('stops just above the max, even for a very long range', () => {
    expect(
      countSeriesTrainings({ ...base, toDate: '9999-12-31', weekdays: ['MONDAY'] }, now),
    ).toBe(MAX_SERIES_TRAININGS + 1);
  });
});

test('seriesCountText', () => {
  expect(seriesCountText(1)).toBe('1 träning skapas');
  expect(seriesCountText(8)).toBe('8 träningar skapas');
});
