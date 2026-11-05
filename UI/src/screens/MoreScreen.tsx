import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing } from '../theme/colors';

type TabParamList = {
  Home: undefined;
  Schema: undefined;
  Laget: undefined;
  Mer: undefined;
  Search: undefined;
  Create: undefined;
};

export default function MoreScreen() {
  const { session, logout } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const isStaff =
    session?.roleName === 'ADMIN' || session?.roleName === 'COACH';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Mer</Text>
      <Text style={styles.hint}>Sök, skapa användare och kontoinställningar.</Text>

      <Pressable style={styles.row} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.rowIcon}>🔍</Text>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>Sök spelare</Text>
          <Text style={styles.rowSub}>Namn, tröjnummer eller telefon</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {isStaff ? (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('Create')}
        >
          <Text style={styles.rowIcon}>＋</Text>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Skapa användare</Text>
            <Text style={styles.rowSub}>Spelare, förälder, tränare</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      <Pressable style={[styles.row, styles.logoutRow]} onPress={() => logout()}>
        <Text style={styles.rowIcon}>⎋</Text>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, styles.logoutText]}>Logga ut</Text>
          <Text style={styles.rowSub}>{session?.email}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.gutter,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 4,
  },
  hint: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  rowSub: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.onSurfaceVariant,
  },
  logoutRow: {
    marginTop: spacing.md,
  },
  logoutText: {
    color: colors.error,
  },
});
