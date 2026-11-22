import { Fragment, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { listMyMatches, listMyTrainings, type MyMatch, type MyTraining } from '../api/my';
import type { ActivityWhen } from '../api/request';
import { trainingTypeName } from '../api/trainingTypes';
import { useAuth } from '../auth/AuthContext';
import { cancelledLabel } from '../components/activities/activityItems';
import { HomeTimelineView, type HomeActivity } from '../components/home';
import { ChildPicker, firstName, useChildPicker } from '../components/schedule/ChildPicker';
import {
  groupByWeek,
  homeFromMatch,
  homeFromTraining,
  statusLabel,
} from '../components/schedule/activities';
import {
  DateText,
  Empty,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  SkeletonList,
  useRefresh,
  WeekLabel,
} from '../components/ui';
import { homeTimeline } from '../lib/activities/homeTimeline';
import { toDate } from '../lib/dates';
import { colors, spacing, type } from '../theme';

/** `now` is when the data arrived; it decides which trainings are "past". */
type Data = { trainings: MyTraining[]; matches: MyMatch[]; now: number };

/** The upcoming activities as start-page cards, and when they arrived. */
type HomeData = { activities: HomeActivity[]; now: Date };

/**
 * "Schema", the start page (Startsida) for PLAYER and PARENT: Nästa aktivitet at the top,
 * then Kommande vecka, and "Visa fler" adds seven days at a time (rule in `homeTimeline`).
 * A parent with several children picks one at the top. The player is never asked
 * whether they come, so the page has no attendance control or own status.
 */
export default function ScheduleScreen() {
  const { session } = useAuth();
  const picker = useChildPicker(session?.roleName);
  const isParent = session?.roleName === 'PARENT';
  const childId = picker.child?.id;

  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "Visa fler" counts per child, so a new child starts at one week again.
  const [more, setMore] = useState<{ childId: number | undefined; weeks: number }>({
    childId: undefined,
    weeks: 0,
  });
  const extraWeeks = more.childId === childId ? more.weeks : 0;

  const noChild = isParent && !picker.loading && childId == null;

  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      if (picker.loading || noChild) {
        return Promise.resolve();
      }
      return Promise.all([listMyTrainings(childId, 'upcoming'), listMyMatches(childId, 'upcoming')])
        .then(([trainings, matches]) => {
          if (!isActive()) return;
          setData({
            activities: [...trainings.map(homeFromTraining), ...matches.map(homeFromMatch)],
            now: new Date(),
          });
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Något gick fel');
        });
    },
    [picker.loading, noChild, childId],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);
  const refresh = useRefresh(load);

  const shownError = picker.error ?? error;
  const loaded = noChild || data != null;
  const timeline =
    data && !noChild
      ? homeTimeline(data.activities, data.now, extraWeeks)
      : { next: null, comingWeek: [], hasMore: false };
  const forName =
    isParent && picker.children.length > 1 && picker.child ? firstName(picker.child.name) : undefined;

  return (
    <Screen title="Schema" refresh={refresh}>
      <ChildPicker state={picker} />
      {shownError ? <Text style={styles.error}>{shownError}</Text> : null}
      {!shownError && !loaded ? <SkeletonList /> : null}
      {!shownError && loaded ? (
        <HomeTimelineView
          {...timeline}
          extraWeeks={extraWeeks}
          onShowMore={() => setMore({ childId, weeks: extraWeeks + 1 })}
          forName={forName}
        />
      ) : null}
    </Screen>
  );
}

type ListProps = {
  title: string;
  /** upcoming: the schedule (soonest first). past: "Tidigare aktiviteter" (newest first). */
  when: ActivityWhen;
  onBack?: () => void;
};

/**
 * The player's or parent's own trainings and matches, per week.
 * Used by "Tidigare aktiviteter" (the start page above has its own layout).
 */
export function MyActivityList({ title, when, onBack }: ListProps) {
  const { session } = useAuth();
  const picker = useChildPicker(session?.roleName);
  const isParent = session?.roleName === 'PARENT';
  const childId = picker.child?.id;

  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A parent without children has nothing to ask for (the API would answer an empty list).
  const noChild = isParent && !picker.loading && childId == null;

  /**
   * `isActive` lets the effect ignore an answer for a child that is no longer chosen.
   * Written with .then (not async/await) so the lint rule can see that setState runs later.
   */
  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      if (picker.loading || noChild) {
        return Promise.resolve();
      }
      return Promise.all([listMyTrainings(childId, when), listMyMatches(childId, when)])
        .then(([trainings, matches]) => {
          if (!isActive()) return;
          setData({ trainings, matches, now: Date.now() });
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Något gick fel');
        });
    },
    [picker.loading, noChild, childId, when],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);
  // Pulling the list down runs the same load again.
  const refresh = useRefresh(load);

  const shownError = picker.error ?? error;
  const groups = data && !noChild ? groupByWeek(data.trainings, data.matches, when === 'past') : [];
  const loaded = noChild || data != null;
  const now = data?.now ?? 0;

  return (
    <Screen title={title} onBack={onBack} refresh={refresh}>
      <ChildPicker state={picker} />
      {shownError ? <Text style={styles.error}>{shownError}</Text> : null}
      {!shownError && !loaded ? <SkeletonList /> : null}
      {!shownError && loaded && groups.length === 0 ? <Empty text="Inga aktiviteter" /> : null}
      {groups.map((group) => (
        <Fragment key={group.key}>
          <WeekLabel date={group.date} />
          <List>
            {group.activities.map((activity) =>
            activity.kind === 'training' ? (
              <TrainingRow
                key={`t${activity.training.id}`}
                training={activity.training}
                now={now}
              />
            ) : (
              <MatchRow key={`m${activity.match.id}`} match={activity.match} />
            ),
            )}
          </List>
        </Fragment>
      ))}
    </Screen>
  );
}

function TrainingRow({ training, now }: { training: MyTraining; now: number }) {
  const cancelled = training.trainingStatus === 'CANCELLED';
  // "Past" means the training has ended; only then can the coach have marked it.
  const past = toDate(training.endsAt).getTime() < now;
  return (
    <Row testID={`training-${training.id}`}>
      <RowTitle style={cancelled ? styles.cancelledTitle : undefined}>{trainingTypeName(training.type)}</RowTitle>
      <DateText start={training.startsAt} end={training.endsAt} />
      {training.venue ? <RowMeta>{training.venue}</RowMeta> : null}
      {cancelled ? (
        <RowMeta style={styles.warning}>{cancelledLabel(training.cancelReason ?? null)}</RowMeta>
      ) : past ? (
        <RowMeta>{statusLabel(training.status)}</RowMeta>
      ) : null}
    </Row>
  );
}

function MatchRow({ match }: { match: MyMatch }) {
  const cancelled = match.status === 'CANCELLED';
  const result = match.result && !cancelled
    ? `${match.result.goalsFor}–${match.result.goalsAgainst}`
    : null;
  return (
    <Row
      testID={`match-${match.id}`}
      right={result ? <Text style={type.rowTitle}>{result}</Text> : undefined}
    >
      <RowTitle style={cancelled ? styles.cancelledTitle : undefined}>{`Match mot ${match.opponent}`}</RowTitle>
      <DateText start={match.kickoffAt} />
      <RowMeta>{`${match.venue} · ${match.homeAway === 'HOME' ? 'Hemma' : 'Borta'}`}</RowMeta>
      {cancelled ? (
        <RowMeta style={styles.warning}>{cancelledLabel(match.cancelReason ?? null)}</RowMeta>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  cancelledTitle: { color: colors.textMuted, textDecorationLine: 'line-through' },
  warning: { color: colors.warning },
  error: { ...type.meta, color: colors.warning, padding: spacing.page },
});
