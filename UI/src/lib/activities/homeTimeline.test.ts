import { homeTimeline } from './homeTimeline';

/** Activities only need a start time for this rule. */
const at = (startsAt: string, id = startsAt) => ({ id, startsAt });

// Sunday 22 November 2026, 12:00 local time.
const NOW = new Date(2026, 10, 22, 12, 0);

describe('homeTimeline', () => {
  it('picks the upcoming activity closest in time as the next activity', () => {
    const result = homeTimeline(
      [at('2026-11-26T17:30:00'), at('2026-11-24T17:30:00'), at('2026-11-25T18:00:00')],
      NOW,
    );
    expect(result.next?.startsAt).toBe('2026-11-24T17:30:00');
  });

  it('never picks an activity that has already started', () => {
    const result = homeTimeline([at('2026-11-22T11:00:00'), at('2026-11-23T17:30:00')], NOW);
    expect(result.next?.startsAt).toBe('2026-11-23T17:30:00');
  });

  it('counts an activity starting exactly now as started', () => {
    const result = homeTimeline([at('2026-11-22T12:00:00'), at('2026-11-23T17:30:00')], NOW);
    expect(result.next?.startsAt).toBe('2026-11-23T17:30:00');
  });

  it('puts the activities within seven days after the next one in the coming week, soonest first', () => {
    const result = homeTimeline(
      [
        at('2026-11-24T17:30:00'), // next
        at('2026-11-28T10:00:00'),
        at('2026-11-26T17:30:00'),
        at('2026-12-01T17:29:00'), // 6 days 23 h 59 min after next: inside
        at('2026-12-01T17:30:00'), // exactly 7 days after next: outside
      ],
      NOW,
    );
    expect(result.comingWeek.map((a) => a.startsAt)).toEqual([
      '2026-11-26T17:30:00',
      '2026-11-28T10:00:00',
      '2026-12-01T17:29:00',
    ]);
  });

  it('does not repeat the next activity in the coming week', () => {
    const result = homeTimeline([at('2026-11-24T17:30:00'), at('2026-11-25T17:30:00')], NOW);
    expect(result.comingWeek.map((a) => a.startsAt)).toEqual(['2026-11-25T17:30:00']);
  });

  it('adds seven more days for every "Visa fler"', () => {
    const items = [
      at('2026-11-24T17:30:00'), // next
      at('2026-11-30T17:30:00'), // week 1
      at('2026-12-05T10:00:00'), // week 2
      at('2026-12-10T17:30:00'), // week 3
    ];
    expect(homeTimeline(items, NOW, 0).comingWeek).toHaveLength(1);
    expect(homeTimeline(items, NOW, 1).comingWeek).toHaveLength(2);
    expect(homeTimeline(items, NOW, 2).comingWeek).toHaveLength(3);
  });

  it('tells whether "Visa fler" would show anything more', () => {
    const items = [at('2026-11-24T17:30:00'), at('2026-12-10T17:30:00')];
    expect(homeTimeline(items, NOW, 0).hasMore).toBe(true);
    expect(homeTimeline(items, NOW, 3).hasMore).toBe(false);
  });

  it('keeps a cancelled activity in place, so the player sees that it is cancelled', () => {
    const cancelled = { ...at('2026-11-24T17:30:00'), cancelled: true };
    const result = homeTimeline([cancelled, at('2026-11-25T17:30:00')], NOW);
    expect(result.next).toBe(cancelled);
  });

  it('gives no next activity and an empty week when nothing is upcoming', () => {
    expect(homeTimeline([at('2026-11-20T17:30:00')], NOW)).toEqual({
      next: null,
      comingWeek: [],
      hasMore: false,
    });
    expect(homeTimeline([], NOW)).toEqual({ next: null, comingWeek: [], hasMore: false });
  });

  it('does not change the list it is given', () => {
    const items = [at('2026-11-26T17:30:00'), at('2026-11-24T17:30:00')];
    const copy = [...items];
    homeTimeline(items, NOW);
    expect(items).toEqual(copy);
  });
});
