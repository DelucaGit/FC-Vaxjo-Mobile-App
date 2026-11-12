import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  useRefresh,
} from '../components/ui';
import { errorText, roleAndTeam } from '../components/users/userHelpers';
import { listUsers, type ClubUser } from '../api/users';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Users'>;

/** "Användare" (spec section 7): Ordförande, Admin. The search filters the loaded list. */
export default function UsersScreen({ navigation }: Props) {
  const [users, setUsers] = useState<ClubUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  /** `isActive` lets the focus effect ignore an answer that comes after the screen lost focus. */
  const load = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const list = await listUsers();
      if (isActive()) {
        setUsers(list);
        setError(null);
      }
    } catch (e) {
      if (isActive()) {
        setError(errorText(e));
      }
    }
  }, []);

  // Reload each time the tab comes back into view, so a changed role shows up.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );
  // Pulling the list down runs the same load again.
  const refresh = useRefresh(load);

  const needle = query.trim().toLowerCase();
  const shown = (users ?? []).filter((u) => u.name.toLowerCase().includes(needle));

  return (
    <Screen
      title="Användare"
      refresh={refresh}
      bottom={<Button title="Ny användare" onPress={() => navigation.navigate('NewUser')} block />}
    >
      <View style={styles.form}>
        <Field
          label="Sök"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {users && shown.length === 0 ? <Empty text="Inga träffar" /> : null}
      {shown.length > 0 ? (
        <List>
          {shown.map((user) => (
            <Row key={user.id} onPress={() => navigation.navigate('UserDetail', { userId: user.id })}>
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
