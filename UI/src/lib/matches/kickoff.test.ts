import { toGoals, toKickoffAt } from './kickoff';

describe('toKickoffAt', () => {
  test('joins date and time into the API format', () => {
    expect(toKickoffAt('2026-11-21', '10:00')).toBe('2026-11-21T10:00:00');
    expect(toKickoffAt(' 2026-11-21 ', '9:30')).toBe('2026-11-21T09:30:00');
  });

  test('rejects days and times that do not exist', () => {
    expect(toKickoffAt('2026-02-31', '10:00')).toBeNull();
    expect(toKickoffAt('2026-11-21', '24:00')).toBeNull();
    expect(toKickoffAt('21/11/2026', '10:00')).toBeNull();
    expect(toKickoffAt('', '10:00')).toBeNull();
  });
});

describe('toGoals', () => {
  test('only whole, non-negative numbers', () => {
    expect(toGoals('0')).toBe(0);
    expect(toGoals('12')).toBe(12);
    expect(toGoals('')).toBeNull();
    expect(toGoals('-1')).toBeNull();
    expect(toGoals('1.5')).toBeNull();
  });
});
