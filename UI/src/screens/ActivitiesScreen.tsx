import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { listMatchAttendance, listMatches } from '../api/matches';
import { listMyTeams, listTeams, type Team } from '../api/teams';
import { listTrainingAttendance, listTrainings } from '../api/trainings';
import { useAuth } from '../auth/AuthContext';
import { isClubWide } from '../auth/permissions';
import {
  Button,
  DateText,
  Empty,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  Segmented,
  WeekLabel,
} from '../components/ui';
import {
  cancelledLabel,
  countAttendance,
  fromMatch,
  fromTraining,
  groupByWeek,
  isPartlyMarked,
  needsAttendanceCount,
  unmarkedLabel,
  type ActivityItem,
  type AttendanceCount,
} from '../components/activities/activityItems';
import { ErrorText } from '../components/activities/TrainingForm';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Activities'>;

/** Key for the attendance counts: a training and a match may share an id. */
const countKey = (item: ActivityItem) => `${item.kind}-${item.id}`;

/** "Aktiviteter" (spec section 7): the chosen team's trainings and matches, per week. */
export default function ActivitiesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const role = session?.roleName;
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [counts, setCounts] = useState<Record<string, AttendanceCount>>({});
  const [error, setError] = useState<string | null>(null);

  // Teams: a coach only sees their own. /my/teams answers 403 for CHAIRMAN, so club-wide roles use /teams.
  useEffect(() => {
    let active = true;
    (isClubWide(role) ? listTeams() : listMyTeams())
      .then((list) => {
        if (!active) return;
        setTeams(list);
        setTeamId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [role]);

  // Runs every time the screen gets focus, so a new or changed activity shows up on the way back.
  useFocusEffect(
    useCallback(() => {
      if (teamId == null) return;
      let active = true;
      Promise.all([listTrainings(teamId), listMatches(teamId)])
        .then(async ([trainings, matches]) => {
          const merged = [...trainings.map(fromTraining), ...matches.map(fromMatch)];
          if (!active) return;
          setItems(merged);
          setError(null);

          // One attendance call per activity that can still have unmarked players.
          const now = new Date();
          const entries = await Promise.all(
            merged
              .filter((item) => needsAttendanceCount(item, now))
              .map(async (item) => {
                try {
                  const rows = await (item.kind === 'training'
                    ? listTrainingAttendance(item.id)
                    : listMatchAttendance(item.id));
                  return [countKey(item), countAttendance(rows)] as const;
                } catch {
                  // The status line is extra information; the list still works without it.
                  return null;
                }
              }),
          );
          if (!active) return;
          setCounts(Object.fromEntries(entries.filter((e) => e != null)));
        })
        .catch((e: Error) => active && setError(e.message));
      return () => {
        active = false;
      };
    }, [teamId]),
  );

  const chooseTeam = (id: number) => {
    setTeamId(id);
    setItems(null);
    setCounts({});
  };

  return (
    <Screen
      title="Aktiviteter"
      bottom={
        teamId != null ? (
          <>
            <Button
              title="Ny träning"
              style={styles.half}
              onPress={() => navigation.navigate('NewTraining', { teamId })}
            />
            <Button
              title="Ny match"
              variant="secondary"
              style={styles.half}
              onPress={() => navigation.navigate('NewMatch', { teamId })}
            />
          </>
        ) : undefined
      }
    >
      <ErrorText message={error} />

      {teams && teams.length > 1 ? (
        <View style={styles.picker}>
          <Segmented
            accessibilityLabel="Lag"
            options={teams.map((t) => ({ label: t.name, value: t.id }))}
            value={teamId}
            onChange={chooseTeam}
          />
        </View>
      ) : null}
      {teams && teams.length === 1 ? (
        <Text style={[type.sectionLabel, styles.teamName]}>{teams[0].name}</Text>
      ) : null}
      {teams && teams.length === 0 ? <Empty text="Inga lag" /> : null}

      {items && items.length === 0 ? <Empty text="Inga aktiviteter" /> : null}
      {items
        ? groupByWeek(items).map((group) => (
            <View key={group.key}>
              <WeekLabel date={group.items[0].startsAt} />
              <List>
                {group.items.map((item) => (
                  <ActivityRow
                    key={countKey(item)}
                    item={item}
                    count={counts[countKey(item)]}
                    onPress={() =>
                      navigation.navigate('ActivityDetail', { kind: item.kind, id: item.id })
                    }
                  />
                ))}
              </List>
            </View>
          ))
        : null}
    </Screen>
  );
}

type RowProps = {
  item: ActivityItem;
  count: AttendanceCount | undefined;
  onPress: () => void;
};

function ActivityRow({ item, count, onPress }: RowProps) {
  return (
    <Row
      onPress={onPress}
      testID={`activity-${countKey(item)}`}
      right={item.result ? <RowTitle>{item.result}</RowTitle> : undefined}
    >
      <RowTitle style={item.cancelled ? styles.struck : undefined}>{item.title}</RowTitle>
      <DateText start={item.startsAt} end={item.endsAt} />
      {item.place ? <RowMeta>{item.place}</RowMeta> : null}
      {item.cancelled ? (
        <RowMeta style={styles.warning}>{cancelledLabel(item.cancelReason)}</RowMeta>
      ) : item.attendanceLockedAt ? (
        <RowMeta>Närvaro låst</RowMeta>
      ) : count && isPartlyMarked(count) ? (
        <RowMeta style={styles.warning}>{unmarkedLabel(count)}</RowMeta>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1 },
  picker: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  teamName: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  warning: { color: colors.warning },
});
