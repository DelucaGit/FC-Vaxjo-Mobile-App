import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addTeamCoach, listTeamCoaches } from '../api/teams';
import { listUsers, type ClubUser } from '../api/users';
import { ErrorText } from '../components/teams/ErrorText';
import { errorMessage } from '../components/teams/errors';
import {
  Empty,
  Field,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  SkeletonList,
} from '../components/ui';
import type { AppStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'AddCoach'>;

/** Active coaches who are not already in the team. */
function availableCoaches(users: readonly ClubUser[], inTeam: readonly ClubUser[]): ClubUser[] {
  const taken = new Set(inTeam.map((coach) => coach.id));
  return users.filter((user) => user.roleName === 'COACH' && user.active && !taken.has(user.id));
}

/**
 * Lägg till tränare (spec section 7): a searchable list of coaches.
 * A tap adds the coach and goes back to Lagsida.
 */
export default function AddCoachScreen({ navigation, route }: Props) {
  const { teamId } = route.params;
  const [coaches, setCoaches] = useState<ClubUser[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([listUsers(), listTeamCoaches(teamId)])
      .then(([users, inTeam]) => setCoaches(availableCoaches(users, inTeam)))
      .catch((e) => setError(errorMessage(e)));
  }, [teamId]);

  async function add(coach: ClubUser) {
    if (adding) {
      return;
    }
    setAdding(true);
    try {
      await addTeamCoach(teamId, coach.id);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
      setAdding(false);
    }
  }

  const needle = query.trim().toLowerCase();
  const shown = (coaches ?? []).filter((coach) => coach.name.toLowerCase().includes(needle));

  return (
    <Screen title="Lägg till tränare" onBack={() => navigation.goBack()}>
      <View style={styles.search}>
        <Field label="Sök" value={query} onChangeText={setQuery} autoCorrect={false} />
      </View>
      <ErrorText message={error} />
      {coaches === null && !error ? <SkeletonList /> : null}
      {coaches && shown.length === 0 ? <Empty text="Inga tränare att lägga till" /> : null}
      {shown.length > 0 ? (
        <List>
          {shown.map((coach) => (
            <Row key={coach.id} onPress={() => void add(coach)}>
              <RowTitle>{coach.name}</RowTitle>
              <RowMeta>{coach.email}</RowMeta>
            </Row>
          ))}
        </List>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { padding: spacing.page },
});
