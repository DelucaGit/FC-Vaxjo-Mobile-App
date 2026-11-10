import type { Match } from '../../api/matches';
import type { AttendanceRow, Training } from '../../api/trainings';
import { isoWeek, toDate } from '../../lib/dates';
import type { ActivityKind } from '../../navigation/types';

/**
 * One row on "Aktiviteter": a training or a match in the same shape,
 * so both can be sorted and grouped by week together.
 */
export type ActivityItem = {
  kind: ActivityKind;
  id: number;
  /** "Träning" (the training's title) or "Match mot Östers IF". */
  title: string;
  startsAt: string;
  /** Only trainings have an end time. */
  endsAt: string | null;
  /** "Plats" or "Plats · Hemma". null when a training has no venue. */
  place: string | null;
  /** "3–1" for a played match, otherwise null. */
  result: string | null;
  cancelled: boolean;
  cancelReason: string | null;
  attendanceLockedAt: string | null;
};

export function homeAwayLabel(homeAway: Match['homeAway']): string {
  return homeAway === 'HOME' ? 'Hemma' : 'Borta';
}

export function matchTitle(match: Pick<Match, 'opponent'>): string {
  return `Match mot ${match.opponent}`;
}

export function resultLabel(result: Match['result']): string | null {
  return result ? `${result.goalsFor}–${result.goalsAgainst}` : null;
}

export function fromTraining(t: Training): ActivityItem {
  return {
    kind: 'training',
    id: t.id,
    title: t.title,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    place: t.venue || null,
    result: null,
    cancelled: t.status === 'CANCELLED',
    cancelReason: t.cancelReason,
    attendanceLockedAt: t.attendanceLockedAt,
  };
}

export function fromMatch(m: Match): ActivityItem {
  return {
    kind: 'match',
    id: m.id,
    title: matchTitle(m),
    startsAt: m.kickoffAt,
    endsAt: null,
    place: `${m.venue} · ${homeAwayLabel(m.homeAway)}`,
    result: resultLabel(m.result),
    cancelled: false,
    cancelReason: null,
    attendanceLockedAt: m.attendanceLockedAt,
  };
}

export type WeekGroup = { key: string; items: ActivityItem[] };

/** Sorts by start time and puts the activities of one ISO week together. */
export function groupByWeek(items: readonly ActivityItem[]): WeekGroup[] {
  const sorted = [...items].sort(
    (a, b) => toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime(),
  );
  const groups: WeekGroup[] = [];
  for (const item of sorted) {
    const d = toDate(item.startsAt);
    // The year is part of the key so week 1 of next year is not mixed with week 1 of this year.
    const key = `${d.getFullYear()}-${isoWeek(d)}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, items: [item] });
    }
  }
  return groups;
}

/** "Inställd · anledning", or just "Inställd" without a reason. */
export function cancelledLabel(reason: string | null): string {
  return reason ? `Inställd · ${reason}` : 'Inställd';
}

/**
 * Only an activity that has started, is not locked and is not cancelled can have
 * players left to mark. Asking the API about the others would be wasted calls.
 */
export function needsAttendanceCount(item: ActivityItem, now: Date): boolean {
  return (
    !item.cancelled &&
    item.attendanceLockedAt == null &&
    toDate(item.startsAt).getTime() <= now.getTime()
  );
}

export type AttendanceCount = { marked: number; total: number };

export function countAttendance(rows: readonly AttendanceRow[]): AttendanceCount {
  return { marked: rows.filter((r) => r.status != null).length, total: rows.length };
}

export function unmarkedLabel(count: AttendanceCount): string {
  return `${count.total - count.marked} ej markerade`;
}

/** The list shows "N ej markerade" only when someone, but not everyone, is marked. */
export function isPartlyMarked(count: AttendanceCount): boolean {
  return count.marked > 0 && count.marked < count.total;
}
