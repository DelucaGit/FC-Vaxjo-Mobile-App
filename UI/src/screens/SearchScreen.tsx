import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Empty,
  Field,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  Segmented,
  type Option,
} from '../components/ui';
import { errorText, isNotFound, roleAndTeam } from '../components/users/userHelpers';
import { searchUsers, type ClubUser, type UserSearch } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Search'>;

type Mode = 'name' | 'number' | 'phone';

const MODES: readonly Option<Mode>[] = [
  { label: 'Namn', value: 'name' },
  { label: 'Tröjnr', value: 'number' },
  { label: 'Telefon', value: 'phone' },
];

/** The server searches on exactly one field. Returns null when the text is not valid for the mode. */
function toSearch(mode: Mode, text: string): UserSearch | null {
  const value = text.trim();
  if (value === '') {
    return null;
  }
  if (mode === 'number') {
    return /^\d+$/.test(value) ? { playerNumber: Number(value) } : null;
  }
  return mode === 'name' ? { name: value } : { phone: value };
}

/** "Sök" (spec section 7): Tränare, Ordförande, Admin. A coach only finds players in their teams. */
export default function SearchScreen({ navigation }: Props) {
  const { session } = useAuth();
  const isCoach = session?.roleName === 'COACH';

  const [mode, setMode] = useState<Mode>('name');
  const [text, setText] = useState('');
  // null: nothing searched yet. An empty list shows "Inga träffar".
  const [results, setResults] = useState<ClubUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = toSearch(mode, text);

  async function runSearch() {
    if (!search) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const found = await searchUsers(search);
      // The server already limits a coach to their own teams; a coach only works with players.
      setResults(isCoach ? found.filter((u) => u.roleName === 'PLAYER') : found);
    } catch (e) {
      if (isNotFound(e)) {
        setResults([]);
      } else {
        setResults(null);
        setError(errorText(e));
      }
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setResults(null);
    setError(null);
  }

  // The Sök tab has no UserDetail screen, so only rows that can open something are pressable.
  const hasUserDetail = navigation.getState().routeNames.includes('UserDetail');
  function openUser(user: ClubUser): (() => void) | undefined {
    if (user.roleName === 'PLAYER') {
      return () => navigation.navigate('PlayerProfile', { userId: user.id });
    }
    if (hasUserDetail) {
      return () => navigation.navigate('UserDetail', { userId: user.id });
    }
    return undefined;
  }

  return (
    <Screen title="Sök">
      <View style={styles.form}>
        <Segmented
          options={MODES}
          value={mode}
          onChange={changeMode}
          accessibilityLabel="Sök på"
        />
        <Field
          label="Sök"
          value={text}
          onChangeText={setText}
          onSubmitEditing={runSearch}
          returnKeyType="search"
          autoCapitalize={mode === 'name' ? 'words' : 'none'}
          autoCorrect={false}
          keyboardType={mode === 'number' ? 'number-pad' : mode === 'phone' ? 'phone-pad' : 'default'}
        />
        <Button title="Sök" onPress={runSearch} disabled={!search || loading} block />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {results && results.length === 0 ? <Empty text="Inga träffar" /> : null}
      {results && results.length > 0 ? (
        <List>
          {results.map((user) => (
            <Row
              key={user.id}
              onPress={openUser(user)}
              right={user.playerNumber != null ? <RowMeta>{user.playerNumber}</RowMeta> : null}
            >
              <RowTitle>{user.name}</RowTitle>
              <RowMeta>{roleAndTeam(user)}</RowMeta>
            </Row>
          ))}
        </List>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, padding: spacing.page },
  error: { color: colors.warning },
});
