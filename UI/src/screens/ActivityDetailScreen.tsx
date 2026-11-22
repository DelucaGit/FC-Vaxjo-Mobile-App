import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMatch, listMatchAttendance, setMatchCancelled, type Match } from '../api/matches';
import {
  getTraining,
  listTrainingAttendance,
  setTrainingCancelled,
  type AttendanceRow,
  type Training,
} from '../api/trainings';
import { trainingTypeName } from '../api/trainingTypes';
import { useAuth } from '../auth/AuthContext';
import { canManageActivities } from '../auth/permissions';
import {
  Button,
  DateText,
  InfoRow,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  SectionLabel,
  SkeletonList,
  useToast,
} from '../components/ui';
import {
  cancelledLabel,
  countAttendance,
  fromMatch,
  fromTraining,
  homeAwayLabel,
  matchTitle,
  needsAttendanceCount,
  resultLabel,
  unmarkedLabel,
  type AttendanceCount,
} from '../components/activities/activityItems';
import { ErrorText } from '../components/activities/TrainingForm';
import { lockedLabel } from '../lib/dates';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ActivityDetail'>;

type Loaded =
  | { kind: 'training'; training: Training }
  | { kind: 'match'; match: Match };

/** "Aktivitetsdetalj" (spec section 7) for one training or one match. */
export default function ActivityDetailScreen({ navigation, route }: Props) {
  const toast = useToast();
  const { kind, id } = route.params;
  const { session } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [count, setCount] = useState<AttendanceCount | null>(null);
  /** "Spelare (N)": the players on the attendance list. null when not shown. */
  const [players, setPlayers] = useState<AttendanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Matches check the role, like "Ändra". Only staff reach trainings here.
  const canManage = kind === 'training' || canManageActivities(session?.roleName);

  const load = useCallback(async () => {
    try {
      const loaded: Loaded =
        kind === 'training'
          ? { kind, training: await getTraining(id) }
          : { kind, match: await getMatch(id) };
      setData(loaded);
      setError(null);

      const item = loaded.kind === 'training' ? fromTraining(loaded.training) : fromMatch(loaded.match);
      // The attendance list is also the list of players. The API refuses it while cancelled
      // and for PLAYER/PARENT, so it is only loaded for staff on an active activity.
      if (canManage && !item.cancelled) {
        const rows = await (kind === 'training' ? listTrainingAttendance(id) : listMatchAttendance(id));
        // A locked list only holds saved rows; unmarked players were left out when it locked.
        setPlayers(item.attendanceLockedAt ? rows.filter((r) => r.status !== null) : rows);
        setCount(needsAttendanceCount(item, new Date()) ? countAttendance(rows) : null);
      } else {
        setPlayers(null);
        setCount(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [kind, id, canManage]);

  // Reload on focus, so the screen is up to date after "Redigera" or "Ställ in".
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const reactivate = async () => {
    setBusy(true);
    try {
      await (kind === 'training' ? setTrainingCancelled(id, false) : setMatchCancelled(id, false));
      toast.show(kind === 'training' ? 'Träningen är återaktiverad' : 'Matchen är återaktiverad');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const training = data?.kind === 'training' ? data.training : null;
  const match = data?.kind === 'match' ? data.match : null;
  const cancelled = (training ?? match)?.status === 'CANCELLED';
  const cancelReason = training?.cancelReason ?? match?.cancelReason ?? null;
  const lockedAt = training?.attendanceLockedAt ?? match?.attendanceLockedAt ?? null;

  let attendance: string | null = null;
  if (lockedAt) {
    attendance = lockedLabel(lockedAt);
  } else if (count && count.marked < count.total) {
    attendance = unmarkedLabel(count);
  }

  // Name and number only: the marks are on the attendance screen.
  const playerList = players ? (
    <>
      <SectionLabel title={`Spelare (${players.length})`} />
      <List>
        {players.map((p) => (
          <Row
            key={p.playerUserId}
            right={p.playerNumber != null ? <RowMeta>#{p.playerNumber}</RowMeta> : undefined}
          >
            <RowTitle>{p.playerName}</RowTitle>
          </Row>
        ))}
      </List>
    </>
  ) : null;

  const statusRow = (
    <InfoRow
      label="Status"
      value={<Text style={[type.body, styles.warning]}>{cancelledLabel(cancelReason)}</Text>}
    />
  );

  return (
    <Screen
      title={kind === 'training' ? 'Träning' : 'Match'}
      onBack={() => navigation.goBack()}
      bottom={
        data ? (
          cancelled ? (
            canManage ? (
              <Button title="Återaktivera" block style={styles.grow} disabled={busy} onPress={reactivate} />
            ) : undefined
          ) : (
            <Button
              title="Närvaro"
              block
              style={styles.grow}
              onPress={() => navigation.navigate('Attendance', { kind, id })}
            />
          )
        ) : undefined
      }
    >
      <ErrorText message={error} />
      {!data && !error ? <SkeletonList /> : null}

      {training ? (
        <>
          <View style={styles.head}>
            <Text style={[type.heading, cancelled && styles.struck]}>{trainingTypeName(training.type)}</Text>
            <DateText start={training.startsAt} end={training.endsAt} />
          </View>
          <List>
            <InfoRow label="Lag" value={training.teamName} />
            <InfoRow label="Plats" value={training.venue || '–'} />
            {cancelled ? statusRow : attendance ? <InfoRow label="Närvaro" value={attendance} /> : null}
          </List>
          {playerList}
          <SectionLabel title="Åtgärder" />
          <List>
            <Row onPress={() => navigation.navigate('EditTraining', { trainingId: id })}>
              <RowTitle>Redigera träning</RowTitle>
            </Row>
            {!cancelled ? (
              <Row onPress={() => navigation.navigate('CancelTraining', { trainingId: id })}>
                <RowTitle style={styles.danger}>Ställ in träning</RowTitle>
              </Row>
            ) : null}
          </List>
        </>
      ) : null}

      {match ? (
        <>
          <View style={styles.head}>
            <Text style={[type.heading, cancelled && styles.struck]}>{matchTitle(match)}</Text>
            <DateText start={match.kickoffAt} end={match.endsAt} />
          </View>
          <List>
            <InfoRow label="Lag" value={match.teamName} />
            <InfoRow label="Plats" value={match.venue} />
            <InfoRow label="Hemma/Borta" value={homeAwayLabel(match.homeAway)} />
            {/* While cancelled the API refuses result and attendance, so neither is shown. */}
            {cancelled ? (
              statusRow
            ) : (
              <>
                <InfoRow label="Resultat" value={resultLabel(match.result) ?? '–'} />
                {attendance ? <InfoRow label="Närvaro" value={attendance} /> : null}
              </>
            )}
          </List>
          {playerList}
          <SectionLabel title="Åtgärder" />
          <List>
            {canManage ? (
              <Row onPress={() => navigation.navigate('EditMatch', { matchId: id })}>
                <RowTitle>Ändra</RowTitle>
              </Row>
            ) : null}
            {!cancelled ? (
              <Row onPress={() => navigation.navigate('SetResult', { matchId: id })}>
                <RowTitle>Ange resultat</RowTitle>
              </Row>
            ) : null}
            {canManage && !cancelled ? (
              <Row onPress={() => navigation.navigate('CancelMatch', { matchId: id })}>
                <RowTitle style={styles.danger}>Ställ in match</RowTitle>
              </Row>
            ) : null}
          </List>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.xs, padding: spacing.page },
  grow: { flex: 1 },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  warning: { color: colors.warning },
  danger: { color: colors.primary },
});
