import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { ChevronRight, Mail } from 'lucide-react-native';
import { listLeaveRequests } from '../api/leaveRequests';
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
  homeFromTeamMatch,
  homeFromTeamTraining,
  isPartlyMarked,
  needsAttendanceCount,
  unmarkedLabel,
  type ActivityItem,
  type AttendanceCount,
} from '../components/activities/activityItems';
import { ErrorText } from '../components/activities/TrainingForm';
import { HomeTimelineView, type HomeActivity } from '../components/home';
import { homeTimeline } from '../lib/activities/homeTimeline';
import type { ActivityKind, AppStackParamList } from '../navigation/types';
import { colors, fonts, radii, sizes, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Activities'>;

/** Key for the attendance counts: a training and a match may share an id. */
const countKey = (item: ActivityItem) => `${item.kind}-${item.id}`;

/** Which teams the start page shows: all the user's teams, or one picked team. */
type TeamChoice = 'all' | number;

/** One card on the start page, with what a tap and the team filter need. */
type HomeEntry = { teamId: number; kind: ActivityKind; id: number; activity: HomeActivity };

/** The upcoming activities of the user's teams, and when they arrived. */
type HomeData = { entries: HomeEntry[]; now: Date };

/**
 * "Aktiviteter", the start page (Startsida) for COACH, CHAIRMAN and ADMIN: Nästa aktivitet,
 * Kommande vecka and "Visa fler" (rule in `homeTimeline`), for every team the user manages,
 * trainings and matches together. Every card shows its team and opens the activity.
 * With several teams a picker narrows it to one team, which is also the team the plus button
 * creates for (the create screens need one team).
 */
export default function ActivitiesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const role = session?.roleName;
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [choice, setChoice] = useState<TeamChoice>('all');
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** How many leave requests wait for an answer. null until known (or when the call fails). */
  const [pendingLeave, setPendingLeave] = useState<number | null>(null);
  // "Visa fler" counts per team choice, so a new choice starts at one week again.
  const [more, setMore] = useState<{ choice: TeamChoice; weeks: number }>({
    choice: 'all',
    weeks: 0,
  });
  const extraWeeks = more.choice === choice ? more.weeks : 0;

  // Teams: a coach only sees their own. /my/teams answers 403 for CHAIRMAN, so club-wide roles
  // use /teams. Then the upcoming trainings and matches of every team, all at once.
  // Written with .then (not async/await) so the lint rule can see that setState runs later.
  const loadActivities = useCallback(
    (isActive: () => boolean = () => true) =>
      (isClubWide(role) ? listTeams() : listMyTeams())
        .then((list) =>
          Promise.all(
            list.map((team) =>
              Promise.all([listTrainings(team.id, 'upcoming'), listMatches(team.id, 'upcoming')]).then(
                ([trainings, matches]): HomeEntry[] => [
                  ...trainings.map((t) => ({
                    teamId: team.id,
                    kind: 'training' as const,
                    id: t.id,
                    activity: homeFromTeamTraining(t),
                  })),
                  ...matches.map((m) => ({
                    teamId: team.id,
                    kind: 'match' as const,
                    id: m.id,
                    activity: homeFromTeamMatch(m),
                  })),
                ],
              ),
            ),
          ).then((perTeam) => {
            if (!isActive()) return;
            setTeams(list);
            setData({ entries: perTeam.flat(), now: new Date() });
            setError(null);
          }),
        )
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Något gick fel');
        }),
    [role],
  );

  // The banner is extra information: if the call fails the page works without it.
  const loadPendingLeave = useCallback(
    (isActive: () => boolean = () => true) =>
      listLeaveRequests({ status: 'PENDING' })
        .then((list) => {
          if (isActive()) setPendingLeave(list.length);
        })
        .catch(() => {
          if (isActive()) setPendingLeave(null);
        }),
    [],
  );

  const load = useCallback(
    (isActive: () => boolean = () => true) =>
      Promise.all([loadActivities(isActive), loadPendingLeave(isActive)]),
    [loadActivities, loadPendingLeave],
  );

  // Runs every time the screen gets focus, so a new or changed activity shows up on the way back.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );
  const refresh = useRefresh(load);

  const shown = data
    ? data.entries.filter((entry) => choice === 'all' || entry.teamId === choice)
    : [];
  const byKey = new Map(shown.map((entry) => [entry.activity.key, entry]));
  const timeline = data
    ? homeTimeline(
        shown.map((entry) => entry.activity),
        data.now,
        extraWeeks,
      )
    : { next: null, comingWeek: [], hasMore: false };

  // The create screens need one team: the only one, or the one picked.
  const createTeamId = teams?.length === 1 ? teams[0].id : choice === 'all' ? null : choice;

  const open = (activity: HomeActivity) => {
    const entry = byKey.get(activity.key);
    if (entry) navigation.navigate('ActivityDetail', { kind: entry.kind, id: entry.id });
  };

  return (
    <Screen
      title="Aktiviteter"
      refresh={refresh}
      overlay={
        createTeamId != null ? (
          <FabMenu
            actions={[
              {
                label: 'Lägg till fotbollsträning',
                onPress: () =>
                  navigation.navigate('NewTraining', { teamId: createTeamId, type: 'FOOTBALL' }),
              },
              {
                label: 'Lägg till fysträning',
                onPress: () =>
                  navigation.navigate('NewTraining', { teamId: createTeamId, type: 'FITNESS' }),
              },
              {
                label: 'Ny match',
                onPress: () => navigation.navigate('NewMatch', { teamId: createTeamId }),
              },
            ]}
          />
        ) : undefined
      }
    >
      <ErrorText message={error} />
      {pendingLeave ? (
        <Pressable
          accessibilityRole="button"
          testID="leave-banner"
          onPress={() => navigation.navigate('LeaveRequests')}
          style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
        >
          <Mail size={24} color={colors.warning} strokeWidth={2} />
          <Text style={styles.bannerText}>{`${pendingLeave} ledighetsbegäran väntar på svar`}</Text>
          <ChevronRight size={20} color={colors.warning} strokeWidth={2} />
        </Pressable>
      ) : null}
      {teams && teams.length > 1 ? (
        <View style={styles.picker}>
          <Segmented<TeamChoice>
            accessibilityLabel="Lag"
            options={[
              { label: 'Alla lag', value: 'all' },
              ...teams.map((t) => ({ label: t.name, value: t.id })),
            ]}
            value={choice}
            onChange={setChoice}
          />
        </View>
      ) : null}
      {!error && data === null ? <SkeletonList /> : null}
      {teams && teams.length === 0 ? <Empty text="Inga lag" /> : null}
      {data && teams && teams.length > 0 ? (
        <HomeTimelineView
          {...timeline}
          extraWeeks={extraWeeks}
          onShowMore={() => setMore({ choice, weeks: extraWeeks + 1 })}
          onPressActivity={open}
        />
      ) : null}
      {/* Empty room at the end, so the plus button never covers the last activity. */}
      {createTeamId != null ? <View style={styles.fabSpace} /> : null}
    </Screen>
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
 * One team's trainings and matches per week, with the same team picker for every role.
 * Used by "Tidigare aktiviteter" (the start page above has its own layout).
 * A tap opens the activity's detail view.
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
  // Prototype `.banner`: soft amber with amber text, the whole card is the button.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touch,
    marginHorizontal: spacing.page,
    marginTop: spacing.page,
    padding: 14,
    borderRadius: radii.control,
    backgroundColor: colors.warningSoft,
  },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.warning },
  pressed: { opacity: 0.8 },
  fabSpace: { height: FAB_SPACE },
  picker: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  teamName: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  warning: { color: colors.warning },
});
