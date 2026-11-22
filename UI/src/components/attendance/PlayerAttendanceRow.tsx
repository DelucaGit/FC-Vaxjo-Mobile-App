import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AttendanceRow } from '../../api/trainings';
import { colors, sizes, spacing, type } from '../../theme';
import { statusLabel } from './attendance';

type Props = {
  row: AttendanceRow;
  /** Locked: the row is plain text and cannot be tapped. */
  locked: boolean;
  /** Called when the coach taps the row (Närvarande <-> Frånvarande). */
  onToggle: () => void;
};

/** One player: name, jersey number and the mark. Tap to switch Närvarande/Frånvarande. */
export function PlayerAttendanceRow({ row, locked, onToggle }: Props) {
  const absent = row.status === 'ABSENT';
  const content = (
    <>
      <Text style={[type.rowTitle, styles.name]} numberOfLines={1}>
        {row.playerName}
      </Text>
      {row.playerNumber != null ? <Text style={type.meta}>#{row.playerNumber}</Text> : null}
      {row.status ? (
        <Text style={[type.body, absent && styles.absent]}>{statusLabel(row.status)}</Text>
      ) : null}
    </>
  );

  // Ledig comes from an approved leave, so the coach cannot tap it away here.
  if (locked || row.status === 'EXCUSED') {
    return (
      <View testID={`player-${row.playerUserId}`} style={styles.row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={`player-${row.playerUserId}`}
      accessibilityRole="button"
      accessibilityLabel={row.playerName}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    minHeight: sizes.touch,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.6 },
  name: { flex: 1 },
  absent: { color: colors.warning },
});
