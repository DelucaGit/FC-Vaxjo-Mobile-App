import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, radius, sizes, spacing, type } from '../../theme';
import { Button } from './Button';
import { Screen } from './Screen';

/**
 * One question in a Guide. `A` is the shape of all the answers together.
 * The Guide keeps the answers, so going back and forth never loses one.
 */
export type GuideStep<A> = {
  /** Unique within the guide. */
  key: string;
  /** The question at the top, e.g. "Vilket lag?". */
  question: string;
  /** The row name on the summary, e.g. "Lag". */
  label: string;
  /** The answer as text on the summary, e.g. "P2014". */
  summary: (answers: A) => string;
  /** "Nästa" is locked until this is true. */
  canProceed: (answers: A) => boolean;
  /** The step's own controls. `update` merges a change into the answers. */
  render: (answers: A, update: (patch: Partial<A>) => void) => ReactNode;
  /** Optional small control in a row with the question, e.g. "Redigera" (issue #218). */
  headerAction?: (answers: A) => ReactNode;
};

type Props<A> = {
  /** The screen title, e.g. "Ny träning". */
  title: string;
  steps: readonly GuideStep<A>[];
  /** The answers when the guide opens (e.g. the only team already picked). */
  initialAnswers: A;
  /** "Bekräfta" on the summary. The guide stays open, answers kept, until the screen leaves. */
  onFinish: (answers: A) => void | Promise<void>;
  /** The header back arrow on the first question. */
  onExit: () => void;
  /** Shown on the summary, e.g. an API error. */
  error?: string | null;
  /** Locks "Bekräfta" while saving. */
  busy?: boolean;
};

/**
 * Issue #216: a form that asks one question at a time (Guide, prototype `wizard()`).
 * Progress bars at the top, one more than the steps for the summary ("Stämmer det här?").
 * "Bakåt" and the header arrow go one step back; on the first step the arrow leaves.
 */
export function Guide<A>({
  title,
  steps,
  initialAnswers,
  onFinish,
  onExit,
  error = null,
  busy = false,
}: Props<A>) {
  const [answers, setAnswers] = useState<A>(initialAnswers);
  const [index, setIndex] = useState(0);
  const onSummary = index >= steps.length;
  const step = onSummary ? null : steps[index];
  const total = steps.length + 1;
  const canGoOn = step ? step.canProceed(answers) : !busy;

  const update = (patch: Partial<A>) => setAnswers((current) => ({ ...current, ...patch }));
  const back = () => (index === 0 ? onExit() : setIndex(index - 1));
  const next = () => {
    if (!canGoOn) return;
    if (step) {
      setIndex(index + 1);
    } else {
      void onFinish(answers);
    }
  };

  return (
    <Screen
      title={title}
      onBack={back}
      bottom={
        <>
          {index > 0 ? (
            <Button title="Bakåt" variant="secondary" style={styles.back} onPress={back} />
          ) : null}
          <Button
            title={onSummary ? 'Bekräfta' : 'Nästa'}
            style={styles.grow}
            disabled={!canGoOn}
            onPress={next}
          />
        </>
      }
    >
      <View style={styles.body}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Steg ${index + 1} av ${total}`}
          accessibilityValue={{ min: 1, max: total, now: index + 1 }}
          style={styles.dots}
        >
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>

        <View style={styles.questionRow}>
          <Text accessibilityRole="header" style={styles.question}>
            {step ? step.question : 'Stämmer det här?'}
          </Text>
          {step?.headerAction ? step.headerAction(answers) : null}
        </View>

        {step ? (
          step.render(answers, update)
        ) : (
          <>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <View style={styles.summary}>
              {steps.map((s, i) => (
                <View key={s.key} style={[styles.sumRow, i === steps.length - 1 && styles.sumLast]}>
                  <Text style={styles.sumLabel}>{s.label}</Text>
                  <Text style={styles.sumValue}>{s.summary(answers)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

type OptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
};

/** A big answer button in a Guide (prototype `.opt`). Red when chosen. */
export function GuideOption({ label, selected, onPress, icon }: OptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && !selected && styles.optionPressed,
        selected && styles.optionOn,
      ]}
    >
      {icon}
      <Text style={[styles.optionText, selected && styles.optionTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.page },
  grow: { flex: 1 },
  back: { flex: 0.5 },
  dots: { flexDirection: 'row', gap: 6, marginVertical: 6, marginHorizontal: 2 },
  dot: { height: 4, flex: 1, borderRadius: radii.pill, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary },
  // Prototype `.qrow`: the question grows, the action sits at its right.
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  question: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 30,
    color: colors.text,
    marginTop: 10,
    marginBottom: 18,
    marginHorizontal: 2,
  },
  error: { ...type.body, color: colors.danger, marginBottom: spacing.md },
  summary: {
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: sizes.divider,
    borderBottomColor: colors.border,
  },
  sumLast: { borderBottomWidth: 0 },
  sumLabel: { ...type.body, color: colors.textMuted },
  sumValue: { ...type.rowTitle, flexShrink: 1, textAlign: 'right' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionPressed: { backgroundColor: colors.muted },
  optionOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  optionTextOn: { color: colors.onPrimary },
});
