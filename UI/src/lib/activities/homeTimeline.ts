import { toDate } from '../dates';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type HomeTimeline<T> = {
  /** Nästa aktivitet: the upcoming activity closest in time, or null. */
  next: T | null;
  /** Kommande vecka: the activities in the days after `next`, soonest first. */
  comingWeek: T[];
  /** True when "Visa fler" would show at least one more activity. */
  hasMore: boolean;
};

/**
 * The start page rule (GLOSSARY: Startsida, Nästa aktivitet, Kommande vecka).
 *
 * - An activity is upcoming until it has started; one starting exactly `now` has started.
 * - `next` is the upcoming activity closest in time. A cancelled one counts too,
 *   so the player sees that it is cancelled.
 * - `comingWeek` holds the activities less than 7 days after `next`, plus 7 more days
 *   for every `extraWeeks` ("Visa fler").
 *
 * Pure: the list it is given is never changed.
 */
export function homeTimeline<T extends { startsAt: string }>(
  items: readonly T[],
  now: Date,
  extraWeeks = 0,
): HomeTimeline<T> {
  const nowMs = now.getTime();
  const upcoming = items
    .map((item) => ({ item, at: toDate(item.startsAt).getTime() }))
    .filter(({ at }) => at > nowMs)
    .sort((a, b) => a.at - b.at);

  const first = upcoming[0];
  if (!first) {
    return { next: null, comingWeek: [], hasMore: false };
  }

  const windowEnd = first.at + (extraWeeks + 1) * WEEK_MS;
  const rest = upcoming.slice(1);
  return {
    next: first.item,
    comingWeek: rest.filter(({ at }) => at < windowEnd).map(({ item }) => item),
    hasMore: rest.some(({ at }) => at >= windowEnd),
  };
}
