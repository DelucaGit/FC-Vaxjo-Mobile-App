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

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Närvarande',
  ABSENT: 'Frånvarande',
  // GLOSSARY.md: "Ledig" is a player with approved leave (EXCUSED in the API).
  EXCUSED: 'Ledig',
};

/** "Närvarande" for PRESENT, and so on. */
export function statusLabel(status: AttendanceStatus): string {
  return STATUS_LABELS[status];
}

/** A row on an open list always has a mark: unmarked players start as Närvarande. */
export function withDefaultPresent(rows: AttendanceRow[]): AttendanceRow[] {
  return rows.map((row) => (row.status === null ? { ...row, status: 'PRESENT' } : row));
}

/** Tapping a player switches Närvarande and Frånvarande. Ledig is never changed by a tap. */
export function toggled(status: AttendanceRow['status']): AttendanceRow['status'] {
  if (status === 'EXCUSED') return status;
  return status === 'ABSENT' ? 'PRESENT' : 'ABSENT';
}

/** What "Spara" writes: one mark per player, except Ledig (that comes from the leave). */
export function marksToSave(
  rows: AttendanceRow[],
): { playerId: number; status: 'PRESENT' | 'ABSENT' }[] {
  return rows
    .filter((row) => row.status !== 'EXCUSED')
    .map((row) => ({
      playerId: row.playerUserId,
      status: row.status === 'ABSENT' ? 'ABSENT' : 'PRESENT',
    }));
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
 * The same calls exist for training and match, with different URLs.
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
        end: m.endsAt ?? null,
        title: `Match mot ${m.opponent}`,
        lockedAt: m.attendanceLockedAt,
      };
    },
    list: () => listMatchAttendance(id),
    mark: (playerId, status) => markMatchAttendance(id, playerId, status),
    lock: async () => (await lockMatchAttendance(id)).attendanceLockedAt,
  };
}
