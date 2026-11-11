/**
 * The fields on "Ny träning" and "Redigera träning", and the rule for when "Spara" is allowed.
 * Pure functions so the rule is easy to test without a screen.
 * The training type is not a field: the screen knows it (button choice or saved training).
 */
export type TrainingFormValues = {
  /** "2026-11-12" */
  date: string;
  /** "17:30" */
  start: string;
  /** "19:00" */
  end: string;
  /** Optional. */
  venue: string;
};

export const NEW_TRAINING_DEFAULTS: TrainingFormValues = {
  date: '',
  start: '17:30',
  end: '19:00',
  venue: '',
};

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // new Date rolls 2026-02-31 over to March, so compare the parts it ends up with.
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** Minutes after midnight, or null when the text is not a time like "17:30". */
function minutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [h, m] = [Number(match[1]), Number(match[2])];
  return h < 24 && m < 60 ? h * 60 + m : null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateTime(date: string, totalMinutes: number): string {
  return `${date.trim()}T${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}:00`;
}

export type TrainingPayload = {
  startsAt: string;
  endsAt: string;
  venue: string | null;
};

/**
 * What the API gets, or null while the form is not ready:
 * date, start and end must be filled in, and end must be after start.
 */
export function toTrainingPayload(values: TrainingFormValues): TrainingPayload | null {
  const start = minutes(values.start);
  const end = minutes(values.end);
  if (!isValidDate(values.date) || start == null || end == null || end <= start) {
    return null;
  }
  return {
    startsAt: toLocalDateTime(values.date, start),
    endsAt: toLocalDateTime(values.date, end),
    venue: values.venue.trim() || null,
  };
}

/** Fills the form from a saved training ("2026-11-12T17:30:00"). */
export function formValuesFrom(training: {
  startsAt: string;
  endsAt: string;
  venue: string | null;
}): TrainingFormValues {
  return {
    date: training.startsAt.slice(0, 10),
    start: training.startsAt.slice(11, 16),
    end: training.endsAt.slice(11, 16),
    venue: training.venue ?? '',
  };
}
