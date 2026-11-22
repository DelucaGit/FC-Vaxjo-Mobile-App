import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users } from 'lucide-react-native';
import { createMatch, type CreateMatchInput, type HomeAway } from '../api/matches';
import type { Team } from '../api/teams';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Field, Screen, SkeletonList, useToast } from '../components/ui';
import { Guide, GuideOption, type GuideStep } from '../components/ui/Guide';
import { MonthCalendar } from '../components/ui/MonthCalendar';
import { TimeWheel } from '../components/ui/TimeWheel';
import { ErrorText } from '../components/activities/TrainingForm';
import { venueGuideStep } from '../components/activities/VenueStep';
import { homeAwayLabel } from '../components/activities/activityItems';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import { toKickoffAt } from '../lib/matches/kickoff';
import { loadVisibleTeams } from '../lib/players/teams';
import { dayAccessibilityLabel } from '../lib/schedule/calendar';
import { isEndAfterStart } from '../lib/schedule/timeWheel';
import type { AppStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewMatch'>;

export type MatchAnswers = {
  teamId: number | null;
  opponent: string;
  /** null until the coach has answered. */
  homeAway: HomeAway | null;
  /** "2026-11-22" */
  day: string | null;
  /** Kick-off, "10:00" */
  start: string;
  /** "11:30" */
  end: string;
  /** A saved venue's name or a typed address. '' until answered. */
  venue: string;
};

const HOME_AWAY: readonly HomeAway[] = ['HOME', 'AWAY'];

/** What the API gets, or null while an answer is missing. */
function payloadOf(a: MatchAnswers): CreateMatchInput | null {
  const opponent = a.opponent.trim();
  const venue = a.venue.trim();
  const kickoffAt = a.day ? toKickoffAt(a.day, a.start) : null;
  const endsAt = a.day ? toKickoffAt(a.day, a.end) : null;
  if (a.teamId == null || !opponent || !a.homeAway || !kickoffAt || !endsAt || !venue) {
    return null;
  }
  return { teamId: a.teamId, opponent, homeAway: a.homeAway, kickoffAt, endsAt, venue };
}

/** Initial team: the one passed from the start page, else the only team. */
function startTeam(teams: readonly Team[], wanted: number | undefined): number | null {
  if (wanted != null && teams.some((t) => t.id === wanted)) return wanted;
  return teams.length === 1 ? teams[0].id : null;
}

/**
 * "Ny match" as a Guide (issue #220): Lag, Motståndare, Hemma/Borta, Dag, Tid, Plats,
 * then a summary. Plats is a saved venue or a typed address. Opened from the menu
 * (no params) or from the start page's plus button (team picked there).
 * After saving the coach lands on the start page. The result is set later.
 */
export default function NewMatchScreen({ navigation, route }: Props) {
  const toast = useToast();
  const { session } = useAuth();
  const role = session?.roleName;
  const wantedTeam = route.params?.teamId;
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Plats step's edit mode. Its "Redigera" sits in the Guide's question row.
  const [editingVenues, setEditingVenues] = useState(false);

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
      <Screen title="Ny match" onBack={exit}>
        <ErrorText message={loadError} />
        {loadError ? null : <SkeletonList rows={3} />}
      </Screen>
    );
  }

  // Issue #115: only ADMIN may set a kick-off that has already passed.
  const kickoffPassed = (a: MatchAnswers) => {
    const kickoffAt = a.day ? toKickoffAt(a.day, a.start) : null;
    return kickoffAt !== null && !canSetPastActivityTime(role) && isPastStart(kickoffAt);
  };

  const steps: GuideStep<MatchAnswers>[] = [
    {
      key: 'team',
      question: 'Vilket lag är ert?',
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
      key: 'opponent',
      question: 'Vilket lag möter ni?',
      label: 'Motståndare',
      summary: (a) => a.opponent.trim(),
      canProceed: (a) => a.opponent.trim() !== '',
      render: (a, update) => (
        <Field
          label="Motståndare"
          value={a.opponent}
          onChangeText={(opponent) => update({ opponent })}
          placeholder="t.ex. Alvesta IF"
          maxLength={80}
          autoFocus
        />
      ),
    },
    {
      key: 'homeAway',
      question: 'Hemma eller borta?',
      label: 'Hemma/Borta',
      summary: (a) => (a.homeAway ? homeAwayLabel(a.homeAway) : ''),
      canProceed: (a) => a.homeAway !== null,
      render: (a, update) => (
        <>
          {HOME_AWAY.map((value) => (
            <GuideOption
              key={value}
              label={homeAwayLabel(value)}
              selected={a.homeAway === value}
              onPress={() => update({ homeAway: value })}
            />
          ))}
        </>
      ),
    },
    {
      key: 'day',
      question: 'Vilken dag spelas matchen?',
      label: 'Dag',
      summary: (a) => (a.day ? dayAccessibilityLabel(a.day) : ''),
      canProceed: (a) => a.day !== null,
      render: (a, update) => <MonthCalendar value={a.day} onChange={(day) => update({ day })} />,
    },
    {
      key: 'time',
      question: 'Vilken tid?',
      label: 'Tid',
      summary: (a) => `${a.start}–${a.end}`,
      canProceed: (a) => isEndAfterStart(a.start, a.end) && !kickoffPassed(a),
      render: (a, update) => (
        <>
          <TimeWheel value={{ start: a.start, end: a.end }} onChange={(range) => update(range)} />
          <ErrorText message={kickoffPassed(a) ? PAST_START_MESSAGE : null} />
        </>
      ),
    },
    venueGuideStep<MatchAnswers>({
      question: 'Var spelas matchen?',
      editing: editingVenues,
      setEditing: setEditingVenues,
      venueOf: (a) => a.venue,
      patch: (venue) => ({ venue }),
      // An away ground is usually new, so its address comes first (prototype).
      address: (a) => (a.homeAway === 'AWAY' ? 'first' : 'last'),
    }),
  ];

  const finish = async (a: MatchAnswers) => {
    const payload = payloadOf(a);
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      await createMatch(payload);
      toast.show('Matchen är sparad');
      // The start page reloads on focus and shows the new match.
      navigation.popTo('Activities');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara matchen.');
      setSaving(false);
    }
  };

  return (
    <Guide
      title="Ny match"
      steps={steps}
      initialAnswers={{
        teamId: startTeam(teams, wantedTeam),
        opponent: '',
        homeAway: null,
        day: null,
        start: '10:00',
        end: '11:30',
        venue: '',
      }}
      onFinish={finish}
      onExit={exit}
      error={error}
      busy={saving}
    />
  );
}
