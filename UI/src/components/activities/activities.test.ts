import type { Match } from '../../api/matches';
import type { Training } from '../../api/trainings';
import {
  fromMatch,
  fromTraining,
  groupByWeek,
  isPartlyMarked,
  needsAttendanceCount,
} from './activityItems';
import { formValuesFrom, NEW_TRAINING_DEFAULTS, toTrainingPayload } from './trainingValues';

const training: Training = {
  id: 1,
  teamId: 1,
  teamName: 'P2014',
  startsAt: '2026-11-12T17:30:00',
  endsAt: '2026-11-12T19:00:00',
  type: 'FOOTBALL',
  venue: null,
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

const match: Match = {
  id: 1,
  teamId: 1,
  teamName: 'P2014',
  opponent: 'Östers IF',
  kickoffAt: '2026-11-21T10:00:00',
  venue: 'Värendsvallen',
  homeAway: 'HOME',
  result: { goalsFor: 3, goalsAgainst: 1 },
  createdByUserId: 1,
  attendanceLockedAt: null,
};

describe('activityItems', () => {
  test('training row shows the Swedish type name', () => {
    expect(fromTraining(training).title).toBe('Fotbollsträning');
    expect(fromTraining({ ...training, type: 'FITNESS' }).title).toBe('Fysträning');
  });

  test('match row has title, result and place with Hemma/Borta', () => {
    const item = fromMatch(match);
    expect(item.title).toBe('Match mot Östers IF');
    expect(item.result).toBe('3–1');
    expect(item.place).toBe('Värendsvallen · Hemma');
  });

  test('groups sorted activities by ISO week', () => {
    const later = fromTraining({ ...training, id: 2, startsAt: '2026-11-10T17:30:00' });
    const groups = groupByWeek([fromMatch(match), fromTraining(training), later]);
    expect(groups.map((g) => g.items.map((i) => `${i.kind}${i.id}`))).toEqual([
      ['training2', 'training1'],
      ['match1'],
    ]);
  });

  test('counts attendance only for started, open, not cancelled activities', () => {
    const now = new Date('2026-11-13T12:00:00');
    expect(needsAttendanceCount(fromTraining(training), now)).toBe(true);
    expect(needsAttendanceCount(fromMatch(match), now)).toBe(false);
    expect(
      needsAttendanceCount(fromTraining({ ...training, status: 'CANCELLED' }), now),
    ).toBe(false);
    expect(
      needsAttendanceCount(fromTraining({ ...training, attendanceLockedAt: '2026-11-12T20:00:00' }), now),
    ).toBe(false);
  });

  test('partly marked means some but not all', () => {
    expect(isPartlyMarked({ marked: 0, total: 5 })).toBe(false);
    expect(isPartlyMarked({ marked: 3, total: 5 })).toBe(true);
    expect(isPartlyMarked({ marked: 5, total: 5 })).toBe(false);
  });
});

describe('trainingForm', () => {
  test('is not ready without a date', () => {
    expect(toTrainingPayload(NEW_TRAINING_DEFAULTS)).toBeNull();
  });

  test('builds local date-times and drops an empty venue', () => {
    expect(toTrainingPayload({ ...NEW_TRAINING_DEFAULTS, date: '2026-11-12' })).toEqual({
      startsAt: '2026-11-12T17:30:00',
      endsAt: '2026-11-12T19:00:00',
      venue: null,
    });
  });

  test('end must be after start, and the date must exist', () => {
    const base = { ...NEW_TRAINING_DEFAULTS, date: '2026-11-12' };
    expect(toTrainingPayload({ ...base, end: '17:30' })).toBeNull();
    expect(toTrainingPayload({ ...base, date: '2026-02-31' })).toBeNull();
    expect(toTrainingPayload({ ...base, start: '25:00' })).toBeNull();
  });

  test('fills the form from a saved training', () => {
    expect(formValuesFrom({ ...training, venue: 'Konstgräset' })).toEqual({
      date: '2026-11-12',
      start: '17:30',
      end: '19:00',
      venue: 'Konstgräset',
    });
  });
});
