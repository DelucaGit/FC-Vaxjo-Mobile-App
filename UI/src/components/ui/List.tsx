import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, sizes, spacing, type } from '../../theme';
import { dayLabel, activityDateLabel, type DateInput } from '../../lib/dates';

/**
 * White box with a thin line above and below (spec: dividers, not cards).
 * It puts a 1 px divider between rows, so the last row has none.
 */
export function List({ children }: { children?: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.list}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  children?: ReactNode;
  /** When set, the row is pressable and shows a chevron. */
  onPress?: () => void;
  /** Something on the right before the chevron, e.g. a result or a jersey number. */
  right?: ReactNode;
  testID?: string;
};

/** One row in a List, at least 48 high. */
export function Row({ children, onPress, right, testID }: RowProps) {
  const content = (
    <>
      <View style={styles.rowBody}>{children}</View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
      {onPress ? (
        <ChevronRight size={20} color={colors.textMuted} strokeWidth={1.5} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

type TextProps = {
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** 15 / 600. */
export function RowTitle({ children, style, numberOfLines }: TextProps) {
  return (
    <Text style={[type.rowTitle, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** 14, muted. */
export function RowMeta({ children, style, numberOfLines }: TextProps) {
  return (
    <Text style={[type.meta, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

type DateTextProps = {
  /** Start of the activity, or the day. */
  start: DateInput;
  /** End time (training). Leave out for a match or a day. */
  end?: DateInput | null;
  /** Only the day ("Tis 12 nov"), no time. */
  dayOnly?: boolean;
  style?: StyleProp<TextStyle>;
};

/** Date row in Anton upper case: "TIS 12 NOV · 17:30–19:00". */
export function DateText({ start, end, dayOnly = false, style }: DateTextProps) {
  return (
    <Text style={[type.dateRow, style]}>
      {dayOnly ? dayLabel(start) : activityDateLabel(start, end)}
    </Text>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderTopWidth: sizes.divider,
    borderBottomWidth: sizes.divider,
    borderColor: colors.border,
  },
  divider: { height: sizes.divider, backgroundColor: colors.border, marginLeft: spacing.page },
  row: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  rowPressed: { backgroundColor: colors.muted },
  rowBody: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end' },
});
