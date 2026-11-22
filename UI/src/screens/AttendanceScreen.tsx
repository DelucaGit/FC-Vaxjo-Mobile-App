import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';
import type { AttendanceRow } from '../api/trainings';
import {
  attendanceApi,
  countStatuses,
  marksToSave,
  toggled,
  withDefaultPresent,
  type ActivityHeader,
} from '../components/attendance/attendance';
import { PlayerAttendanceRow } from '../components/attendance/PlayerAttendanceRow';
import {
  Button,
  Confirm,
  DateText,
  Empty,
  List,
  Screen,
  SkeletonList,
  useRefresh,
  useToast,
} from '../components/ui';
import {
  ATTENDANCE_NOT_OPEN_MESSAGE,
  isAttendanceOpen,
} from '../lib/activities/attendanceWindow';
import { lockedLabel } from '../lib/dates';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Attendance'>;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Något gick fel';
}

/**
 * Närvaro (spec section 7). Every player starts as Närvarande; the coach taps those who
 * did not come. Nothing is sent until "Spara", which writes every mark and then locks the list.
 */
export default function AttendanceScreen({ navigation, route }: Props) {
  const toast = useToast();
  const { kind, id } = route.params;
  const api = useMemo(() => attendanceApi(kind, id), [kind, id]);

  const [header, setHeader] = useState<ActivityHeader | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  /**
   * Issue #124: marking opens 30 min before start. The API has the same rule and decides.
   * Checked once when the screen loads; reopening the screen checks again.
   */
  const [windowOpen, setWindowOpen] = useState(true);

  /** `isActive` lets the effect ignore an answer that comes after the screen is gone. */
  // Written with .then (not async/await) so the lint rule can see that setState runs later, not inside the effect.
  const load = useCallback(
    (isActive: () => boolean = () => true) =>
      Promise.all([api.loadHeader(), api.list()])
        .then(([loadedHeader, loadedRows]) => {
          if (isActive()) {
            setHeader(loadedHeader);
            // Open list: unmarked players are shown (and later saved) as Närvarande.
            setRows(loadedHeader.lockedAt == null ? withDefaultPresent(loadedRows) : loadedRows);
            setWindowOpen(isAttendanceOpen(loadedHeader.start));
            setLoadError(null);
          }
        })
        .catch((e: unknown) => {
          if (isActive()) setLoadError(messageOf(e));
        }),
    [api],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);
  // Pulling down loads the list again, e.g. to see marks another coach just made.
  const refresh = useRefresh(load);

  const locked = header?.lockedAt != null;
  // A locked list only holds saved rows. After an automatic lock, unmarked players are left out.
  const visibleRows = locked ? rows.filter((row) => row.status !== null) : rows;
  const counts = countStatuses(visibleRows);

  /** Local only. Nothing is sent until "Spara". */
  function toggle(playerId: number) {
    setError(null);
    setRows((current) =>
      current.map((row) =>
        row.playerUserId === playerId ? { ...row, status: toggled(row.status) } : row,
      ),
    );
  }

  /**
   * Writes every mark, then locks. The lock is only sent when every write worked,
   * so a failed write leaves the list open and the local marks as they are.
   */
  async function saveAndLock() {
    setConfirmOpen(false);
    setError(null);
    setSaving(true);
    try {
      try {
        await Promise.all(marksToSave(rows).map((m) => api.mark(m.playerId, m.status)));
      } catch {
        setError('Närvaron kunde inte sparas. Försök igen.');
        return;
      }
      try {
        const lockedAt = await api.lock();
        setHeader((current) => (current ? { ...current, lockedAt } : current));
        toast.show('Närvaron är sparad och låst');
      } catch {
        setError('Närvaron kunde inte låsas. Försök igen.');
      }
    } finally {
      setSaving(false);
    }
  }

  const back = () => navigation.goBack();

  if (loadError) {
    return (
      <Screen title="Närvaro" onBack={back} refresh={refresh}>
        <Text style={[type.body, styles.error]}>{loadError}</Text>
      </Screen>
    );
  }
  if (!header) {
    return (
      <Screen title="Närvaro" onBack={back} refresh={refresh}>
        <SkeletonList rows={6} />
      </Screen>
    );
  }

  const notOpenYet = !locked && !windowOpen;
  // Nothing to tap when the list is locked or not open yet.
  const readOnly = locked || notOpenYet;
  const bottom = readOnly ? undefined : (
    <Button
      title="Spara"
      disabled={saving}
      onPress={() => setConfirmOpen(true)}
      block
      style={styles.grow}
    />
  );

  return (
    <Screen title="Närvaro" onBack={back} bottom={bottom} refresh={refresh}>
      <View style={styles.head}>
        <DateText start={header.start} end={header.end} />
        <Text style={type.heading}>{header.title}</Text>
        <Text style={type.meta}>
          {counts.present} närvarande · {counts.absent} frånvarande · {counts.excused} ledig
        </Text>
        {locked ? (
          <View style={styles.locked}>
            <Lock size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={type.body}>Närvaro låst</Text>
            <Text style={type.meta}>{lockedLabel(header.lockedAt as string)}</Text>
          </View>
        ) : notOpenYet ? (
          <Text style={type.meta}>{ATTENDANCE_NOT_OPEN_MESSAGE}</Text>
        ) : null}
        {error ? <Text style={[type.body, styles.warning]}>{error}</Text> : null}
      </View>

      {visibleRows.length === 0 ? (
        <Empty text="Inga spelare" />
      ) : (
        <List>
          {visibleRows.map((row) => (
            <PlayerAttendanceRow
              key={row.playerUserId}
              row={row}
              locked={readOnly}
              onToggle={() => toggle(row.playerUserId)}
            />
          ))}
        </List>
      )}

      <Confirm
        visible={confirmOpen}
        title="Spara och låsa närvaron?"
        message="Den går inte att ändra efteråt."
        confirmLabel="Spara"
        onConfirm={() => void saveAndLock()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.sm, padding: spacing.page },
  locked: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warning: { color: colors.warning },
  error: { color: colors.warning, padding: spacing.page },
  grow: { flex: 1 },
});
