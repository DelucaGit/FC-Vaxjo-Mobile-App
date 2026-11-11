import { isPastStart } from './startTime';

describe('isPastStart', () => {
  // Wednesday 11 Nov 2026, 13:00 on the phone's clock.
  const now = new Date(2026, 10, 11, 13, 0);

  test('an earlier day has passed', () => {
    expect(isPastStart('2026-11-10T18:00:00', now)).toBe(true);
    expect(isPastStart('2011-05-01T18:00:00', now)).toBe(true);
  });

  test('an earlier time today has passed', () => {
    expect(isPastStart('2026-11-11T12:30:00', now)).toBe(true);
  });

  test('a later time today, or a later day, has not passed', () => {
    expect(isPastStart('2026-11-11T13:30:00', now)).toBe(false);
    expect(isPastStart('2026-11-12T09:00:00', now)).toBe(false);
  });

  test('right now is not in the past', () => {
    expect(isPastStart('2026-11-11T13:00:00', now)).toBe(false);
  });

  test('text that is not a date-time is left to the other checks', () => {
    expect(isPastStart('', now)).toBe(false);
  });
});
