import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ClubUser, createUser, searchByName } from '../api/users';

const ROLES = ['PLAYER', 'PARENT', 'COACH', 'ADMIN'] as const;

export default function CreateUserScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState<(typeof ROLES)[number]>('PLAYER');
  const [playerNumber, setPlayerNumber] = useState('');
  const [mobilePhoneNumber, setMobilePhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [parentSearch, setParentSearch] = useState('');
  const [parentMatches, setParentMatches] = useState<ClubUser[]>([]);
  const [selectedParent, setSelectedParent] = useState<ClubUser | null>(null);
  const [createNewParent, setCreateNewParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  useEffect(() => {
    if (roleName !== 'PLAYER' || createNewParent || selectedParent) {
      setParentMatches([]);
      return;
    }

    const trimmed = parentSearch.trim();
    if (trimmed.length < 1) {
      setParentMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const users = await searchByName(trimmed);
        setParentMatches(users.filter((user) => user.roleName === 'PARENT'));
      } catch {
        setParentMatches([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [parentSearch, roleName, createNewParent, selectedParent]);

  function resetParentFields() {
    setParentSearch('');
    setParentMatches([]);
    setSelectedParent(null);
    setCreateNewParent(false);
    setNewParentName('');
    setNewParentEmail('');
    setNewParentPhone('');
  }

  async function onCreate() {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      setMessage(null);
      return;
    }

    let shirt: number | null = null;
    if (playerNumber.trim()) {
      shirt = Number(playerNumber.trim());
      if (Number.isNaN(shirt)) {
        setError('Shirt number must be a number.');
        setMessage(null);
        return;
      }
    }

    if (roleName === 'PLAYER') {
      if (createNewParent) {
        if (!newParentName.trim() || !newParentEmail.trim() || !newParentPhone.trim()) {
          setError('New parent needs name, email, and phone.');
          setMessage(null);
          return;
        }
      } else if (!selectedParent) {
        setError('Pick an existing parent or create a new one.');
        setMessage(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createUser({
        name: name.trim(),
        email: email.trim(),
        roleName,
        playerNumber: shirt,
        mobilePhoneNumber: mobilePhoneNumber.trim() || null,
        parentId: roleName === 'PLAYER' && selectedParent ? selectedParent.id : null,
        newParent:
          roleName === 'PLAYER' && createNewParent
            ? {
                name: newParentName.trim(),
                email: newParentEmail.trim(),
                mobilePhoneNumber: newParentPhone.trim(),
              }
            : null,
      });

      const parentInfo = created.parentName
        ? ` Parent: ${created.parentName}.`
        : '';
      setMessage(
        `Created ${created.name} (id ${created.id}, role ${created.roleName}).${parentInfo}`,
      );
      setName('');
      setEmail('');
      setPlayerNumber('');
      setMobilePhoneNumber('');
      setRoleName('PLAYER');
      resetParentFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create a user</Text>
      <Text style={styles.hint}>Saves to the local Java API / PostgreSQL.</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="TESTMAN" />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="testman@fcvaxjo.se"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.modeRow}>
        {ROLES.map((role) => (
          <Pressable
            key={role}
            onPress={() => {
              setRoleName(role);
              resetParentFields();
            }}
            style={[styles.modeButton, roleName === role ? styles.modeButtonActive : null]}
          >
            <Text
              style={[
                styles.modeButtonText,
                roleName === role ? styles.modeButtonTextActive : null,
              ]}
            >
              {role}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Shirt number (optional)</Text>
      <TextInput
        style={styles.input}
        value={playerNumber}
        onChangeText={setPlayerNumber}
        placeholder="42"
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Phone (optional)</Text>
      <TextInput
        style={styles.input}
        value={mobilePhoneNumber}
        onChangeText={setMobilePhoneNumber}
        placeholder="+46701112233"
        keyboardType="phone-pad"
      />

      {roleName === 'PLAYER' ? (
        <View style={styles.parentBox}>
          <Text style={styles.parentTitle}>Parent (required)</Text>
          <Text style={styles.hint}>
            Search for an existing parent, or create a new one with this player.
          </Text>

          {!createNewParent && !selectedParent ? (
            <>
              <Text style={styles.label}>Search parent by name</Text>
              <TextInput
                style={styles.input}
                value={parentSearch}
                onChangeText={setParentSearch}
                placeholder="Type a parent name"
              />
              {parentMatches.map((parent) => (
                <Pressable
                  key={parent.id}
                  style={styles.matchRow}
                  onPress={() => {
                    setSelectedParent(parent);
                    setParentMatches([]);
                    setParentSearch(parent.name);
                  }}
                >
                  <Text style={styles.matchName}>{parent.name}</Text>
                  <Text style={styles.matchMeta}>{parent.email}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setCreateNewParent(true);
                  setSelectedParent(null);
                  setParentMatches([]);
                  setNewParentName(parentSearch.trim());
                }}
              >
                <Text style={styles.secondaryButtonText}>Create new parent instead</Text>
              </Pressable>
            </>
          ) : null}

          {selectedParent ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedText}>
                Selected: {selectedParent.name} ({selectedParent.email})
              </Text>
              <Pressable onPress={resetParentFields}>
                <Text style={styles.clearLink}>Clear</Text>
              </Pressable>
            </View>
          ) : null}

          {createNewParent ? (
            <View>
              <Text style={styles.label}>New parent name</Text>
              <TextInput
                style={styles.input}
                value={newParentName}
                onChangeText={setNewParentName}
                placeholder="Parent name"
              />
              <Text style={styles.label}>New parent email</Text>
              <TextInput
                style={styles.input}
                value={newParentEmail}
                onChangeText={setNewParentEmail}
                placeholder="parent@email.se"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.label}>New parent phone</Text>
              <TextInput
                style={styles.input}
                value={newParentPhone}
                onChangeText={setNewParentPhone}
                placeholder="+4670..."
                keyboardType="phone-pad"
              />
              <Pressable style={styles.secondaryButton} onPress={resetParentFields}>
                <Text style={styles.secondaryButtonText}>Back to search</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable style={styles.button} onPress={onCreate} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Create user'}</Text>
      </Pressable>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f7f7f7',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: '#555',
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e5e5e5',
  },
  modeButtonActive: {
    backgroundColor: '#1b4332',
  },
  modeButtonText: {
    fontWeight: '600',
    color: '#222',
    fontSize: 12,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  parentBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eef2ef',
    borderWidth: 1,
    borderColor: '#c5d0c8',
  },
  parentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  matchRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  matchName: {
    fontWeight: '700',
  },
  matchMeta: {
    color: '#555',
    marginTop: 2,
  },
  selectedBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1b4332',
  },
  selectedText: {
    fontWeight: '600',
    marginBottom: 6,
  },
  clearLink: {
    color: '#9b2226',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#1b4332',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#1b4332',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  success: {
    marginTop: 12,
    color: '#1b4332',
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    color: '#9b2226',
  },
});
