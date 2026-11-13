import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { listMatchAttendance, listMatches } from '../api/matches';
import type { ActivityWhen } from '../api/request';
import { listMyTeams, listTeams, type Team } from '../api/teams';
import { listTrainingAttendance, listTrainings } from '../api/trainings';
import { useAuth } from '../auth/AuthContext';
import { isClubWide } from '../auth/permissions';
import {
  DateText,
  Empty,
  FAB_SPACE,
  FabMenu,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  Segmented,
  SkeletonList,
  useRefresh,
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

/** "Aktiviteter" (spec section 7): the chosen team's today's and coming trainings and matches, per week. */
export default function ActivitiesScreen({ navigation }: Props) {
  return (
    <TeamActivityList title="Aktiviteter" when="upcoming" navigation={navigation} canCreate />
  );
}

type ListProps = {
  title: string;
  /** upcoming: soonest first. past: "Tidigare aktiviteter", newest first. */
  when: ActivityWhen;
  navigation: Pick<NativeStackNavigationProp<AppStackParamList>, 'navigate'>;
  /** Shows the plus button with "Lägg till ...träning" (two kinds) and "Ny match". */
  canCreate?: boolean;
  onBack?: () => void;
};

/**
 * One team's trainings and matches, with the same team picker for every role.
 * Shared by "Aktiviteter" and "Tidigare aktiviteter". A tap opens the activity's detail view.
 */
export function TeamActivityList({ title, when, navigation, canCreate = false, onBack }: ListProps) {
  const { session } = useAuth();
  const role = session?.roleName;
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [counts, setCounts] = useState<Record<string, AttendanceCount>>({});
  const [error, setError] = useState<string | null>(null);

  // Teams: a coach only sees their own. /my/teams answers 403 for CHAIRMAN, so club-wide roles use /teams.
  // `isActive` lets an effect ignore an answer that comes too late (another role or team by then).
  // Written with .then (not async/await) so the lint rule can see that setState runs later.
  const loadTeams = useCallback(
    (isActive: () => boolean = () => true) =>
      (isClubWide(role) ? listTeams() : listMyTeams())
        .then((list) => {
          if (!isActive()) return;
          setTeams(list);
          setTeamId((current) => current ?? list[0]?.id ?? null);
        })
        .catch((e: Error) => {
          if (isActive()) setError(e.message);
        }),
    [role],
  );

  useEffect(() => {
    let active = true;
    void loadTeams(() => active);
    return () => {
      active = false;
    };
  }, [loadTeams]);

  const loadActivities = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (teamId == null) return;
      try {
        const [trainings, matches] = await Promise.all([
          listTrainings(teamId, when),
          listMatches(teamId, when),
        ]);
        const merged = [...trainings.map(fromTraining), ...matches.map(fromMatch)];
        if (!isActive()) return;
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
        if (!isActive()) return;
        setCounts(Object.fromEntries(entries.filter((e) => e != null)));
      } catch (e) {
        if (isActive()) setError((e as Error).message);
      }
    },
    [teamId, when],
  );

  // Runs every time the screen gets focus, so a new or changed activity shows up on the way back.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadActivities(() => active);
      return () => {
        active = false;
      };
    }, [loadActivities]),
  );

  // Pulling the list down loads the teams and the chosen team's activities again.
  const loadAll = useCallback(
    () => Promise.all([loadTeams(), loadActivities()]),
    [loadTeams, loadActivities],
  );
  const refresh = useRefresh(loadAll);

  const chooseTeam = (id: number) => {
    setTeamId(id);
    setItems(null);
    setCounts({});
  };

  return (
    <Screen
      title={title}
      onBack={onBack}
      refresh={refresh}
      overlay={
        canCreate && teamId != null ? (
          <FabMenu
            actions={[
              {
                label: 'Lägg till fotbollsträning',
                onPress: () => navigation.navigate('NewTraining', { teamId, type: 'FOOTBALL' }),
              },
              {
                label: 'Lägg till fysträning',
                onPress: () => navigation.navigate('NewTraining', { teamId, type: 'FITNESS' }),
              },
              { label: 'Ny match', onPress: () => navigation.navigate('NewMatch', { teamId }) },
            ]}
          />
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

      {/* First load (or a new team): grey rows until the activities arrive. Not on an error. */}
      {!error && (teams === null || (teamId != null && items === null)) ? <SkeletonList /> : null}

      {items && items.length === 0 ? <Empty text="Inga aktiviteter" /> : null}
      {items
        ? groupByWeek(items, when === 'past').map((group) => (
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
      {/* Empty room at the end, so the plus button never covers the last activity. */}
      {canCreate && teamId != null ? <View style={styles.fabSpace} /> : null}
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
  fabSpace: { height: FAB_SPACE },
  picker: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  teamName: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  warning: { color: colors.warning },
});
