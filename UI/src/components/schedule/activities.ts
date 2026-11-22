import type { MyMatch, MyTraining } from '../../api/my';
import { trainingTypeName } from '../../api/trainingTypes';
import type { HomeActivity } from '../home/homeActivity';
import { isoWeek, toDate } from '../../lib/dates';

/** One row in the schedule: a training or a match, with the time it starts. */
export type Activity =
  | { kind: 'training'; startsAt: string; training: MyTraining }
  | { kind: 'match'; startsAt: string; match: MyMatch };

export type WeekGroup = {
  /** "2026-46": year and ISO week, so week 1 of two years never merge. */
  key: string;
  /** Any date in the week, for WeekLabel. */
  date: string;
  activities: Activity[];
};

/**
 * The year an ISO week belongs to: the year of its Thursday.
 * Mon 29 Dec 2025 is in week 1 of 2026, so it must group with 2 Jan 2026.
 */
function isoWeekYear(value: string): number {
  const d = toDate(value);
  const dayOfWeek = d.getDay() || 7; // Sunday = 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 4 - dayOfWeek).getFullYear();
}

/**
 * Puts trainings and matches in one list, split per ISO week.
 * Oldest first (the schedule: soonest first), or newest first for "Tidigare aktiviteter".
 */
export function groupByWeek(
  trainings: MyTraining[],
  matches: MyMatch[],
  newestFirst = false,
): WeekGroup[] {
  const direction = newestFirst ? -1 : 1;
  const all: Activity[] = [
    ...trainings.map((t): Activity => ({ kind: 'training', startsAt: t.startsAt, training: t })),
    ...matches.map((m): Activity => ({ kind: 'match', startsAt: m.kickoffAt, match: m })),
  ].sort((a, b) => direction * (toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime()));

  const groups: WeekGroup[] = [];
  for (const activity of all) {
    const key = `${isoWeekYear(activity.startsAt)}-${isoWeek(activity.startsAt)}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.activities.push(activity);
    } else {
      groups.push({ key, date: activity.startsAt, activities: [activity] });
    }
  }
  return groups;
}

const STATUS_LABELS = {
  PRESENT: 'Närvarande',
  ABSENT: 'Frånvarande',
  EXCUSED: 'Ursäktad',
} as const;

/** The player's own mark in Swedish, "–" when the coach has not marked it. */
export function statusLabel(status: MyTraining['status']): string {
  return status ? STATUS_LABELS[status] : '–';
}

/** A player's training as a card on the start page. */
export function homeFromTraining(t: MyTraining): HomeActivity {
  return {
    key: `t${t.id}`,
    kind: 'training',
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    title: trainingTypeName(t.type),
    venue: t.venue,
    cancelled: t.trainingStatus === 'CANCELLED',
    cancelReason: t.cancelReason,
  };
}

/** A player's match as a card on the start page. */
export function homeFromMatch(m: MyMatch): HomeActivity {
  return {
    key: `m${m.id}`,
    kind: 'match',
    startsAt: m.kickoffAt,
    title: `Match mot ${m.opponent}`,
    venue: m.venue,
    homeAway: m.homeAway,
    cancelled: m.status === 'CANCELLED',
    cancelReason: m.cancelReason,
  };
}
