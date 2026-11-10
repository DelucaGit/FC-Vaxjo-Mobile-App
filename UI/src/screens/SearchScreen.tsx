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
import { roleLabel } from '../auth/roles';
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
      setError('Skriv något att söka på.');
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
          setError('Ingen användare matchade namnet.');
        }
      } else if (mode === 'number') {
        const shirtNumber = Number(trimmed);
        if (Number.isNaN(shirtNumber)) {
          setError('Tröjnumret måste vara ett tal.');
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
      setError(err instanceof Error ? err.message : 'Sökningen misslyckades.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Hitta en användare</Text>
      <Text style={styles.hint}>Sök på namn, tröjnummer eller telefon.</Text>

      <View style={styles.modeRow}>
        <ModeButton label="Namn" active={mode === 'name'} onPress={() => setMode('name')} />
        <ModeButton label="Tröjnr" active={mode === 'number'} onPress={() => setMode('number')} />
        <ModeButton label="Telefon" active={mode === 'phone'} onPress={() => setMode('phone')} />
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={
          mode === 'name'
            ? 't.ex. TESTMAN'
            : mode === 'number'
              ? 't.ex. 42'
              : 't.ex. +46701112233'
        }
        autoCapitalize={mode === 'name' ? 'words' : 'none'}
        keyboardType={mode === 'number' ? 'number-pad' : mode === 'phone' ? 'phone-pad' : 'default'}
      />

      <Pressable style={styles.button} onPress={onSearch} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Söker…' : 'Sök'}</Text>
      </Pressable>

      {loading ? <ActivityIndicator style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.cardTitle}>{user.name}</Text>
          <Text>E-post: {user.email}</Text>
          <Text>Roll: {roleLabel(user.roleName)}</Text>
          <Text>Tröjnr: {user.playerNumber ?? '—'}</Text>
          <Text>Telefon: {user.mobilePhoneNumber ?? '—'}</Text>
          <Text>Förälder: {user.parentName ?? '—'}</Text>
          <Text>Lag: {user.teamName ?? '—'}</Text>
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
