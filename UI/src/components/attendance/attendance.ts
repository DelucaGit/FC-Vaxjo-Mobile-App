import { getMatch, listMatchAttendance, lockMatchAttendance, markMatchAttendance } from '../../api/matches';
import {
  getTraining,
  listTrainingAttendance,
  lockTrainingAttendance,
  markTrainingAttendance,
  type AttendanceRow,
  type AttendanceStatus,
} from '../../api/trainings';
import { trainingTypeName } from '../../api/trainingTypes';
import type { ActivityKind } from '../../navigation/types';

export const STATUS_OPTIONS = [
  { label: 'Närvarande', value: 'PRESENT' },
  { label: 'Frånvarande', value: 'ABSENT' },
  { label: 'Ursäktad', value: 'EXCUSED' },
] as const satisfies readonly { label: string; value: AttendanceStatus }[];

/** "Närvarande" for PRESENT, and so on. Used for the text in a locked list. */
export function statusLabel(status: AttendanceStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? '';
}

export type Counts = { present: number; absent: number; excused: number; unmarked: number };

export function countStatuses(rows: AttendanceRow[]): Counts {
  const counts: Counts = { present: 0, absent: 0, excused: 0, unmarked: 0 };
  for (const row of rows) {
    if (row.status === 'PRESENT') counts.present += 1;
    else if (row.status === 'ABSENT') counts.absent += 1;
    else if (row.status === 'EXCUSED') counts.excused += 1;
    else counts.unmarked += 1;
  }
  return counts;
}

/** What the screen shows at the top: date row, title and lock time. */
export type ActivityHeader = {
  start: string;
  /** End time for a training. null for a match. */
  end: string | null;
  title: string;
  lockedAt: string | null;
};

/**
 * The same three calls exist for training and match, with different URLs.
 * This picks the right set once, so the screen never has to ask "training or match?".
 */
export type AttendanceApi = {
  loadHeader: () => Promise<ActivityHeader>;
  list: () => Promise<AttendanceRow[]>;
  mark: (playerId: number, status: AttendanceStatus) => Promise<AttendanceRow>;
  /** Returns the new lock time. */
  lock: () => Promise<string | null>;
};

export function attendanceApi(kind: ActivityKind, id: number): AttendanceApi {
  if (kind === 'training') {
    return {
      loadHeader: async () => {
        const t = await getTraining(id);
        return { start: t.startsAt, end: t.endsAt, title: trainingTypeName(t.type), lockedAt: t.attendanceLockedAt };
      },
      list: () => listTrainingAttendance(id),
      mark: (playerId, status) => markTrainingAttendance(id, playerId, status),
      lock: async () => (await lockTrainingAttendance(id)).attendanceLockedAt,
    };
  }
  return {
    loadHeader: async () => {
      const m = await getMatch(id);
      return {
        start: m.kickoffAt,
        end: null,
        title: `Match mot ${m.opponent}`,
        lockedAt: m.attendanceLockedAt,
      };
    },
    list: () => listMatchAttendance(id),
    mark: (playerId, status) => markMatchAttendance(id, playerId, status),
    lock: async () => (await lockMatchAttendance(id)).attendanceLockedAt,
  };
}
