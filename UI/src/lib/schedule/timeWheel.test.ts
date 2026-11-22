import {
  END_BEFORE_START_MESSAGE,
  HOURS,
  indexFromOffset,
  isEndAfterStart,
  MINUTES,
  snapTime,
  withHour,
  withMinute,
} from './timeWheel';

describe('wheel options', () => {
  test('hours are 00 to 23', () => {
    expect(HOURS).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });

  test('minutes are only 00, 05 … 55', () => {
    expect(MINUTES).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });
});

// Rule: snapping rounds DOWN to the five minutes before.
// 10:03 -> 10:00. It never moves to the next hour or the next day.
describe('snapTime', () => {
  test('rounds down to five minutes', () => {
    expect(snapTime('10:03')).toBe('10:00');
    expect(snapTime('10:04')).toBe('10:00');
    expect(snapTime('10:05')).toBe('10:05');
    expect(snapTime('10:59')).toBe('10:55');
  });

  test('23:59 stays on the same day as 23:55', () => {
    expect(snapTime('23:59')).toBe('23:55');
    expect(snapTime('23:55')).toBe('23:55');
  });

  test('pads hours and minutes', () => {
    expect(snapTime('7:5')).toBe('07:05');
    expect(snapTime('00:00')).toBe('00:00');
  });

  test('text that is not a time gives null', () => {
    expect(snapTime('')).toBeNull();
    expect(snapTime('24:00')).toBeNull();
    expect(snapTime('12:60')).toBeNull();
    expect(snapTime('abc')).toBeNull();
  });
});

describe('withHour and withMinute', () => {
  test('changes one part and keeps the other', () => {
    expect(withHour('17:30', 9)).toBe('09:30');
    expect(withMinute('17:30', 45)).toBe('17:45');
  });

  test('a minute that is not on the wheel is snapped down', () => {
    expect(withMinute('10:00', 3)).toBe('10:00');
    expect(withMinute('10:00', 58)).toBe('10:55');
  });

  test('23:55 can be reached', () => {
    expect(withMinute(withHour('00:00', 23), 55)).toBe('23:55');
  });
});

describe('isEndAfterStart', () => {
  test('end after start is accepted', () => {
    expect(isEndAfterStart('17:30', '19:00')).toBe(true);
    expect(isEndAfterStart('23:50', '23:55')).toBe(true);
  });

  test('end equal to start is rejected', () => {
    expect(isEndAfterStart('17:30', '17:30')).toBe(false);
  });

  test('end before start is rejected', () => {
    expect(isEndAfterStart('19:00', '17:30')).toBe(false);
    expect(isEndAfterStart('10:05', '10:00')).toBe(false);
  });

  test('an end after midnight is not "after" a late start: same day only', () => {
    expect(isEndAfterStart('23:55', '00:00')).toBe(false);
  });

  test('text that is not a time is rejected', () => {
    expect(isEndAfterStart('17:30', '')).toBe(false);
    expect(isEndAfterStart('x', '19:00')).toBe(false);
  });

  test('message is in Swedish', () => {
    expect(END_BEFORE_START_MESSAGE).toBe('Sluttiden måste vara efter starttiden');
  });
});

describe('indexFromOffset', () => {
  // A wheel row is 44 px high.
  test('picks the row nearest the scroll position', () => {
    expect(indexFromOffset(0, 44, 12)).toBe(0);
    expect(indexFromOffset(44, 44, 12)).toBe(1);
    expect(indexFromOffset(65, 44, 12)).toBe(1);
    expect(indexFromOffset(67, 44, 12)).toBe(2);
  });

  test('never leaves the list when scrolled past an end', () => {
    expect(indexFromOffset(-30, 44, 12)).toBe(0);
    expect(indexFromOffset(10_000, 44, 12)).toBe(11);
  });
});
