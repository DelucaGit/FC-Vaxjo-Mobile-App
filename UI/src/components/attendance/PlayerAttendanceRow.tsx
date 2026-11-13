import { StyleSheet, Text, View } from 'react-native';
import type { AttendanceRow, AttendanceStatus } from '../../api/trainings';
import { colors, sizes, spacing, type } from '../../theme';
import { Segmented } from '../ui';
import { STATUS_OPTIONS, statusLabel } from './attendance';

type Props = {
  row: AttendanceRow;
  /** Locked: the status is plain text and cannot be changed. */
  locked: boolean;
  onChange: (status: AttendanceStatus) => void;
};

/** One player: name, jersey number, and the three choices (spec: Närvaro). */
export function PlayerAttendanceRow({ row, locked, onChange }: Props) {
  const unmarked = !locked && row.status === null;
  return (
    <View
      testID={`player-${row.playerUserId}`}
      style={[styles.row, unmarked && styles.unmarked]}
    >
      <View style={styles.top}>
        <Text style={[type.rowTitle, styles.name]} numberOfLines={1}>
          {row.playerName}
        </Text>
        {locked && row.status ? <Text style={type.body}>{statusLabel(row.status)}</Text> : null}
        {row.playerNumber != null ? <Text style={type.meta}>#{row.playerNumber}</Text> : null}
      </View>
      {locked ? null : (
        <Segmented
          options={STATUS_OPTIONS}
          value={row.status}
          onChange={onChange}
          accessibilityLabel={row.playerName}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    minHeight: sizes.touch,
    backgroundColor: colors.surface,
  },
  // 4 px warning edge; padding shrinks by the same amount so the text stays in line.
  unmarked: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    paddingLeft: spacing.page - 4,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
});
