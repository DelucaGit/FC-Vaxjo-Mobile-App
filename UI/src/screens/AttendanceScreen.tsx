import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';
import type { AttendanceRow, AttendanceStatus } from '../api/trainings';
import {
  attendanceApi,
  countStatuses,
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

/** Närvaro (spec section 7): mark each player, then lock the list with "Klar". */
export default function AttendanceScreen({ navigation, route }: Props) {
  const { kind, id } = route.params;
  const api = useMemo(() => attendanceApi(kind, id), [kind, id]);

  const [header, setHeader] = useState<ActivityHeader | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** How many mark calls are still on their way. "Klar" waits for them. */
  const [saving, setSaving] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [locking, setLocking] = useState(false);
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
            setRows(loadedRows);
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

  function setStatus(playerId: number, from: AttendanceStatus | null, to: AttendanceStatus | null) {
    setRows((current) =>
      current.map((row) =>
        row.playerUserId === playerId && row.status === from ? { ...row, status: to } : row,
      ),
    );
  }

  /**
   * Optimistic: the row changes at once, then the call is sent.
   * If the call fails, the row goes back and the server's (Swedish) message is shown.
   */
  async function mark(playerId: number, previous: AttendanceStatus | null, next: AttendanceStatus) {
    setError(null);
    setStatus(playerId, previous, next);
    setSaving((n) => n + 1);
    try {
      await api.mark(playerId, next);
    } catch (e) {
      setStatus(playerId, next, previous);
      setError(messageOf(e));
    } finally {
      setSaving((n) => n - 1);
    }
  }

  function markAllPresent() {
    for (const row of rows) {
      if (row.status === null) {
        void mark(row.playerUserId, null, 'PRESENT');
      }
    }
  }

  async function lock() {
    setConfirmOpen(false);
    setError(null);
    setLocking(true);
    try {
      const lockedAt = await api.lock();
      setHeader((current) => (current ? { ...current, lockedAt } : current));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLocking(false);
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
  // No mark buttons when the list is locked or not open yet.
  const readOnly = locked || notOpenYet;
  const left = counts.unmarked;
  const bottom = readOnly ? undefined : (
    <Button
      title={left > 0 ? `${left} spelare kvar att markera` : 'Klar'}
      disabled={left > 0 || saving > 0 || locking}
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
          {counts.present} närvarande · {counts.absent} frånvarande · {counts.excused} ursäktad ·{' '}
          <Text style={left > 0 ? styles.warning : undefined}>{left} ej markerade</Text>
        </Text>
        {locked ? (
          <View style={styles.locked}>
            <Lock size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={type.meta}>{lockedLabel(header.lockedAt as string)}</Text>
          </View>
        ) : notOpenYet ? (
          <Text style={type.meta}>{ATTENDANCE_NOT_OPEN_MESSAGE}</Text>
        ) : (
          <Button
            title="Markera alla närvarande"
            variant="secondary"
            disabled={left === 0}
            onPress={markAllPresent}
          />
        )}
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
              onChange={(next) => void mark(row.playerUserId, row.status, next)}
            />
          ))}
        </List>
      )}

      <Confirm
        visible={confirmOpen}
        title="Låsa närvaron?"
        message="Den går inte att ändra efteråt."
        confirmLabel="Lås närvaron"
        onConfirm={() => void lock()}
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
