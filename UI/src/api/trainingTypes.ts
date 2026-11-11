/**
 * The fixed list of training types (issue #118). The API sends only the enum value,
 * so the Swedish name lives here, in one place. A new type needs a line here too.
 */
export type TrainingType = 'FOOTBALL' | 'FITNESS';

const NAMES: Record<TrainingType, string> = {
  FOOTBALL: 'Fotbollsträning',
  FITNESS: 'Fysträning',
};

/** "Fotbollsträning" or "Fysträning". */
export function trainingTypeName(type: TrainingType): string {
  return NAMES[type];
}
