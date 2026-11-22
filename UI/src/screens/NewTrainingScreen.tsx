import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users } from 'lucide-react-native';
import type { Team } from '../api/teams';
import {
  createTraining,
  createTrainingSeries,
  type CreateTrainingSeriesInput,
  type Weekday,
} from '../api/trainings';
import { trainingTypeName } from '../api/trainingTypes';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Field, Screen, SkeletonList, useToast } from '../components/ui';
import { Guide, GuideOption, type GuideStep } from '../components/ui/Guide';
import { MonthCalendar } from '../components/ui/MonthCalendar';
import { TimeWheel } from '../components/ui/TimeWheel';
import { ErrorText } from '../components/activities/TrainingForm';
import { toTrainingPayload } from '../components/activities/trainingValues';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import {
  MAX_SERIES_TRAININGS,
  NONE_CREATED_MESSAGE,
  TOO_MANY_MESSAGE,
  WEEKDAYS,
  countSeriesTrainings,
  seriesCountText,
} from '../lib/activities/trainingSeries';
import { loadVisibleTeams } from '../lib/players/teams';
import { dayAccessibilityLabel } from '../lib/schedule/calendar';
import { isEndAfterStart } from '../lib/schedule/timeWheel';
import type { AppStackParamList } from '../navigation/types';
import { colors, fonts, spacing, type as text } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTraining'>;

export type TrainingAnswers = {
  teamId: number | null;
  /** "2026-11-22" */
  day: string | null;
  /** "17:30" */
  start: string;
  /** "19:00" */
  end: string;
  /** Optional. */
  venue: string;
  /** null until the coach has answered. */
  repeat: boolean | null;
  /** The last day of the series (included). */
  until: string | null;
};

const ONCE = 'Nej, bara en gång';
const WEEKLY = 'Ja, varje vecka';

/** "2026-11-23" -> "MONDAY". */
function weekdayOf(day: string): Weekday {
  const [y, m, d] = day.split('-').map(Number);
  // getDay() is 0 on Sunday; WEEKDAYS starts on Monday.
  return WEEKDAYS[(new Date(y, m - 1, d).getDay() + 6) % 7].value;
}

function payloadOf(a: TrainingAnswers) {
  return a.day
    ? toTrainingPayload({ date: a.day, start: a.start, end: a.end, venue: a.venue })
    : null;
}

/** The series body, or null while the repeat answer is not complete. */
function seriesOf(
  a: TrainingAnswers,
  type: CreateTrainingSeriesInput['type'],
): CreateTrainingSeriesInput | null {
  const payload = payloadOf(a);
  if (a.teamId == null || !a.day || !a.until || !payload || a.until < a.day) {
    return null;
  }
  return {
    teamId: a.teamId,
    type,
    weekdays: [weekdayOf(a.day)],
    startTime: a.start,
    endTime: a.end,
    venue: payload.venue,
    fromDate: a.day,
    toDate: a.until,
  };
}

/** Initial team: the one passed from the start page, else the only team. */
function startTeam(teams: readonly Team[], wanted: number | undefined): number | null {
  if (wanted != null && teams.some((t) => t.id === wanted)) return wanted;
  return teams.length === 1 ? teams[0].id : null;
}

/**
 * "Ny träning" as a Guide (issue #216): Lag, Dag, Tid, Plats, Upprepa, then a summary.
 * Opened from the menu (no params, a football training) or from the start page's plus
 * button (team and type picked there). After saving the coach lands on the start page.
 */
export default function NewTrainingScreen({ navigation, route }: Props) {
  const toast = useToast();
  const { session } = useAuth();
  const role = session?.roleName;
  const type = route.params?.type ?? 'FOOTBALL';
  const wantedTeam = route.params?.teamId;
  const title = route.params?.type ? trainingTypeName(type) : 'Ny träning';
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadVisibleTeams(role)
      .then((list) => {
        if (active) setTeams(list);
      })
      .catch((e: Error) => {
        if (active) setLoadError(e.message);
      });
    return () => {
      active = false;
    };
  }, [role]);

  const exit = () => navigation.goBack();

  if (!teams) {
    return (
      <Screen title={title} onBack={exit}>
        <ErrorText message={loadError} />
        {loadError ? null : <SkeletonList rows={3} />}
      </Screen>
    );
  }

  // Issue #115: only ADMIN may start a training in the past.
  const startPassed = (a: TrainingAnswers) => {
    const payload = payloadOf(a);
    return payload !== null && !canSetPastActivityTime(role) && isPastStart(payload.startsAt);
  };
  const seriesCount = (a: TrainingAnswers) => {
    const series = seriesOf(a, type);
    return series ? countSeriesTrainings(series) : 0;
  };

  const steps: GuideStep<TrainingAnswers>[] = [
    {
      key: 'team',
      question: 'Vilket lag?',
      label: 'Lag',
      summary: (a) => teams.find((t) => t.id === a.teamId)?.name ?? '',
      canProceed: (a) => a.teamId != null,
      render: (a, update) => (
        <>
          {teams.map((t) => (
            <GuideOption
              key={t.id}
              label={t.name}
              selected={a.teamId === t.id}
              onPress={() => update({ teamId: t.id })}
              icon={<Users size={26} color={a.teamId === t.id ? colors.onPrimary : colors.icon} />}
            />
          ))}
        </>
      ),
    },
    {
      key: 'day',
      question: 'Vilken dag?',
      label: 'Dag',
      summary: (a) => (a.day ? dayAccessibilityLabel(a.day) : ''),
      canProceed: (a) => a.day !== null,
      render: (a, update) => (
        // A new day can be before the series' last day: ask for that again.
        <MonthCalendar
          value={a.day}
          onChange={(day) => update({ day, until: a.until && a.until < day ? null : a.until })}
        />
      ),
    },
    {
      key: 'time',
      question: 'Vilken tid?',
      label: 'Tid',
      summary: (a) => `${a.start}–${a.end}`,
      canProceed: (a) => isEndAfterStart(a.start, a.end) && !startPassed(a),
      render: (a, update) => (
        <>
          <TimeWheel value={{ start: a.start, end: a.end }} onChange={(range) => update(range)} />
          <ErrorText message={startPassed(a) ? PAST_START_MESSAGE : null} />
        </>
      ),
    },
    {
      key: 'venue',
      question: 'Var ska ni vara?',
      label: 'Plats',
      summary: (a) => a.venue.trim() || 'Ingen plats',
      canProceed: () => true,
      render: (a, update) => (
        <Field
          label="Plats (valfri)"
          value={a.venue}
          onChangeText={(venue) => update({ venue })}
          maxLength={80}
        />
      ),
    },
    {
      key: 'repeat',
      question: 'Upprepa varje vecka?',
      label: 'Upprepa',
      summary: (a) =>
        a.repeat && a.until
          ? `Varje vecka till ${dayAccessibilityLabel(a.until)} (${seriesCountText(seriesCount(a))})`
          : ONCE,
      canProceed: (a) => {
        if (a.repeat === null) return false;
        if (!a.repeat) return true;
        const count = seriesCount(a);
        return count > 0 && count <= MAX_SERIES_TRAININGS;
      },
      render: (a, update) => {
        const count = seriesCount(a);
        const note = !a.until
          ? null
          : count > MAX_SERIES_TRAININGS
            ? TOO_MANY_MESSAGE
            : count === 0
              ? NONE_CREATED_MESSAGE
              : null;
        return (
          <>
            <GuideOption label={WEEKLY} selected={a.repeat === true} onPress={() => update({ repeat: true })} />
            <GuideOption label={ONCE} selected={a.repeat === false} onPress={() => update({ repeat: false })} />
            {a.repeat ? (
              <View style={styles.until}>
                <Text style={styles.label}>Sista dagen</Text>
                <MonthCalendar
                  value={a.until}
                  onChange={(until) => update({ until: a.day && until < a.day ? null : until })}
                />
                {note ? (
                  <ErrorText message={note} />
                ) : count > 0 ? (
                  <Text style={[text.body, styles.count]}>{seriesCountText(count)}</Text>
                ) : null}
              </View>
            ) : null}
          </>
        );
      },
    },
  ];

  const finish = async (a: TrainingAnswers) => {
    const payload = payloadOf(a);
    const series = a.repeat ? seriesOf(a, type) : null;
    if (a.teamId == null || !payload || (a.repeat && !series)) return;
    setSaving(true);
    setError(null);
    try {
      if (series) {
        const created = await createTrainingSeries(series);
        if (created.length === 0) {
          // The phone's clock let it through, but the API found only passed dates.
          setError(NONE_CREATED_MESSAGE);
          setSaving(false);
          return;
        }
        toast.show('Träningarna är sparade');
      } else {
        await createTraining({ teamId: a.teamId, type, ...payload });
        toast.show('Träningen är sparad');
      }
      // The start page reloads on focus and shows the new training.
      navigation.popTo('Activities');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Guide
      title={title}
      steps={steps}
      initialAnswers={{
        teamId: startTeam(teams, wantedTeam),
        day: null,
        start: '17:30',
        end: '19:00',
        venue: '',
        repeat: null,
        until: null,
      }}
      onFinish={finish}
      onExit={exit}
      error={error}
      busy={saving}
    />
  );
}

const styles = StyleSheet.create({
  until: { marginTop: spacing.sm, gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginHorizontal: 2 },
  count: { marginHorizontal: 2 },
});
