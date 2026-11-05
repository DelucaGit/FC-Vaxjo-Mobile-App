import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ClubUser,
  searchByName,
  searchByPhone,
  searchByShirtNumber,
} from '../api/users';
import { colors, radius } from '../theme/colors';

type SearchMode = 'name' | 'number' | 'phone';

export default function SearchScreen() {
  const [mode, setMode] = useState<SearchMode>('name');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Type something to search.');
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'name') {
        const users = await searchByName(trimmed);
        setResults(users);
        if (users.length === 0) {
          setError('No users matched that name.');
        }
      } else if (mode === 'number') {
        const shirtNumber = Number(trimmed);
        if (Number.isNaN(shirtNumber)) {
          setError('Shirt number must be a number.');
          setResults([]);
          return;
        }
        const user = await searchByShirtNumber(shirtNumber);
        setResults([user]);
      } else {
        const user = await searchByPhone(trimmed);
        setResults([user]);
      }
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Find a user</Text>
      <Text style={styles.hint}>Search by name, shirt number, or phone.</Text>

      <View style={styles.modeRow}>
        <ModeButton label="Name" active={mode === 'name'} onPress={() => setMode('name')} />
        <ModeButton label="Shirt #" active={mode === 'number'} onPress={() => setMode('number')} />
        <ModeButton label="Phone" active={mode === 'phone'} onPress={() => setMode('phone')} />
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={
          mode === 'name'
            ? 'e.g. TESTMAN'
            : mode === 'number'
              ? 'e.g. 42'
              : 'e.g. +46701112233'
        }
        autoCapitalize={mode === 'name' ? 'words' : 'none'}
        keyboardType={mode === 'number' ? 'number-pad' : mode === 'phone' ? 'phone-pad' : 'default'}
      />

      <Pressable style={styles.button} onPress={onSearch} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Searching…' : 'Search'}</Text>
      </Pressable>

      {loading ? <ActivityIndicator style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.cardTitle}>{user.name}</Text>
          <Text>Email: {user.email}</Text>
          <Text>Role: {user.roleName}</Text>
          <Text>Shirt #: {user.playerNumber ?? '—'}</Text>
          <Text>Phone: {user.mobilePhoneNumber ?? '—'}</Text>
          <Text>Parent: {user.parentName ?? '—'}</Text>
          <Text>Team: {user.teamName ?? '—'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, active ? styles.modeButtonActive : null]}
    >
      <Text style={[styles.modeButtonText, active ? styles.modeButtonTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: colors.background,
    flexGrow: 1,
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  modeButtonTextActive: {
    color: colors.onPrimary,
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    color: colors.onSurface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  loader: {
    marginTop: 16,
  },
  error: {
    marginTop: 12,
    color: colors.error,
  },
  card: {
    marginTop: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
});
