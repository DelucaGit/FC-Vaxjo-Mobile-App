import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createTeam } from '../api/teams';
import { useAuth } from '../auth/AuthContext';
import { canCreateTeam } from '../auth/roles';
import type { TabParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/colors';

/**
 * Creating a team is club work for an admin or a chairman (ADR 0006).
 * The tab is not registered for other roles. This check is a second lock
 * so the form is not usable if the screen is opened by mistake.
 */
export default function CreateTeamScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const allowed = canCreateTeam(session?.roleName);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCreateTeam() {
    if (!allowed) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Team name is required (e.g. P15).');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const team = await createTeam(trimmed);
      setName('');
      setMessage(`Laget ${team.name} är skapat.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create team failed.');
    } finally {
      setLoading(false);
    }
  }

  if (!allowed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Skapa lag</Text>
        <Text style={styles.hint}>Bara en admin eller ordförande kan skapa lag.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => navigation.navigate('Laget')} hitSlop={8}>
        <Text style={styles.back}>← Tillbaka</Text>
      </Pressable>
      <Text style={styles.title}>Skapa lag</Text>
      <Text style={styles.hint}>Bara en admin eller ordförande kan skapa ett nytt lag.</Text>

      <Text style={styles.label}>Nytt lagnamn</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="P15"
        autoCapitalize="characters"
      />
      <Pressable
        style={styles.button}
        onPress={onCreateTeam}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{loading ? 'Sparar…' : 'Skapa lag'}</Text>
      </Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.gutter,
    paddingBottom: 40,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  back: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  hint: {
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    color: colors.onSurface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  success: {
    marginTop: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    color: colors.error,
  },
});
