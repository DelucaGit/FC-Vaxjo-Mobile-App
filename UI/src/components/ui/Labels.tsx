import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../../theme';
import { weekLabel, type DateInput } from '../../lib/dates';

type SectionLabelProps = {
  title: string;
  /** Optional link button on the right, e.g. "Lägg till tränare". */
  actionLabel?: string;
  onAction?: () => void;
};

/** Small muted heading above a List. */
export function SectionLabel({ title, actionLabel, onAction }: SectionLabelProps) {
  return (
    <View style={styles.section}>
      <Text style={[type.sectionLabel, styles.grow]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          {({ pressed }) => (
            <Text style={[type.sectionLabel, styles.action, pressed && styles.underline]}>
              {actionLabel}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/** "VECKA 46" above the activities of that week. */
export function WeekLabel({ date }: { date: DateInput }) {
  return <Text style={[type.weekLabel, styles.week]}>{weekLabel(date)}</Text>;
}

/** Label on the left, value on the right. A string value gets the 15 px text style. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.info}>
      <Text style={type.meta}>{label}</Text>
      <View style={styles.infoValue}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text style={[type.body, styles.right]}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

/** One short muted line when a list has nothing, e.g. "Inga aktiviteter". */
export function Empty({ text }: { text: string }) {
  return <Text style={[type.meta, styles.empty]}>{text}</Text>;
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  grow: { flex: 1 },
  action: { color: colors.primary },
  underline: { textDecorationLine: 'underline' },
  week: { paddingHorizontal: spacing.page, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: spacing.page,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  infoValue: { flex: 1, alignItems: 'flex-end' },
  right: { textAlign: 'right' },
  empty: { paddingHorizontal: spacing.page, paddingVertical: spacing.page },
});
