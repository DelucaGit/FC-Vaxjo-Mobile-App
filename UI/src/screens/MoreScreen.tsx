import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getUserById } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../auth/roles';
import { List, Row, RowTitle, Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';
import { colors, sizes, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'More'>;

/** "Mer" (spec section 7): name and role at the top, then "Byt lösenord" and "Logga ut". */
export default function MoreScreen({ navigation }: Props) {
  const { session, logout } = useAuth();
  const name = useOwnName(session?.userId);

  return (
    <Screen title="Mer">
      <View style={styles.who}>
        <Text style={type.heading}>{name ?? session?.email}</Text>
        <Text style={type.meta}>{roleLabel(session?.roleName)}</Text>
      </View>
      <List>
        <Row onPress={() => navigation.navigate('ChangePassword')}>
          <RowTitle>Byt lösenord</RowTitle>
        </Row>
        <Row onPress={() => logout()}>
          <RowTitle>Logga ut</RowTitle>
        </Row>
      </List>
    </Screen>
  );
}

/**
 * The login answer has no name, and the API has no "me" endpoint.
 * GET /users/{id} on yourself works for ADMIN, CHAIRMAN and PLAYER;
 * other roles get 403. Then the screen shows the e-mail instead.
 */
function useOwnName(userId: number | undefined): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (userId == null) {
      return;
    }
    let active = true;
    getUserById(userId)
      .then((user) => {
        if (active) setName(user.name);
      })
      .catch(() => {
        // Not allowed for this role: keep showing the e-mail.
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return name;
}

const styles = StyleSheet.create({
  who: {
    padding: spacing.page,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: sizes.divider,
    borderBottomColor: colors.border,
  },
});
