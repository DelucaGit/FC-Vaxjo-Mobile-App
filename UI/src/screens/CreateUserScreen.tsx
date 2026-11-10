import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Team, listTeams } from '../api/teams';
import { ClubUser, createUser, searchByName } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { assignableRoles, roleLabel } from '../auth/roles';
import type { ClubRoleName } from '../auth/roles';
import { colors, radius } from '../theme/colors';

export default function CreateUserScreen() {
  const { session } = useAuth();
  const roles = assignableRoles(session?.roleName);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState<ClubRoleName>('PLAYER');
  const [playerNumber, setPlayerNumber] = useState('');
  const [mobilePhoneNumber, setMobilePhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [parentSearch, setParentSearch] = useState('');
  const [parentMatches, setParentMatches] = useState<ClubUser[]>([]);
  const [selectedParent, setSelectedParent] = useState<ClubUser | null>(null);
  const [createNewParent, setCreateNewParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  useEffect(() => {
    listTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  const showParentSearch =
    roleName === 'PLAYER' && !createNewParent && !selectedParent;
  // Hide stale hits without clearing them inside an effect. The search
  // effect only writes matches after the network call returns.
  const visibleParentMatches =
    showParentSearch && parentSearch.trim().length > 0 ? parentMatches : [];

  useEffect(() => {
    if (!showParentSearch) {
      return;
    }

    const trimmed = parentSearch.trim();
    if (trimmed.length < 1) {
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
  }, [parentSearch, showParentSearch]);

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
      setError('Fyll i namn och e-post.');
      setMessage(null);
      return;
    }

    let shirt: number | null = null;
    if (playerNumber.trim()) {
      shirt = Number(playerNumber.trim());
      if (Number.isNaN(shirt)) {
        setError('Tröjnumret måste vara ett tal.');
        setMessage(null);
        return;
      }
    }

    if (roleName === 'PLAYER') {
      if (!selectedTeam) {
        setError('Välj ett lag för spelaren.');
        setMessage(null);
        return;
      }
      if (createNewParent) {
        if (!newParentName.trim() || !newParentEmail.trim() || !newParentPhone.trim()) {
          setError('Den nya föräldern behöver namn, e-post och telefon.');
          setMessage(null);
          return;
        }
      } else if (!selectedParent) {
        setError('Välj en befintlig förälder eller skapa en ny.');
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
        teamId: roleName === 'PLAYER' && selectedTeam ? selectedTeam.id : null,
      });

      const parentInfo = created.parentName
        ? ` Parent: ${created.parentName}.`
        : '';
      const teamInfo = created.teamName ? ` Team: ${created.teamName}.` : '';
      const tempInfo = created.temporaryPassword
        ? ` Temp password: ${created.temporaryPassword}.`
        : '';
      const parentTempInfo = created.parentTemporaryPassword
        ? ` Parent temp password: ${created.parentTemporaryPassword}.`
        : '';
      setMessage(
        `Created ${created.name} (id ${created.id}, role ${created.roleName}).${parentInfo}${teamInfo}${tempInfo}${parentTempInfo}`,
      );
      setName('');
      setEmail('');
      setPlayerNumber('');
      setMobilePhoneNumber('');
      setRoleName('PLAYER');
      setSelectedTeam(null);
      resetParentFields();
      listTeams().then(setTeams).catch(() => setTeams([]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skapa användaren.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Skapa en användare</Text>
      <Text style={styles.hint}>Användaren sparas i klubbens databas.</Text>

      <Text style={styles.label}>Namn</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="TESTMAN" />

      <Text style={styles.label}>E-post</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="testman@fcvaxjo.se"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Roll</Text>
      <View style={styles.modeRow}>
        {roles.map((role) => (
          <Pressable
            key={role}
            onPress={() => {
              setRoleName(role);
              setSelectedTeam(null);
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
              {roleLabel(role)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Tröjnummer (valfritt)</Text>
      <TextInput
        style={styles.input}
        value={playerNumber}
        onChangeText={setPlayerNumber}
        placeholder="42"
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Telefon (valfritt)</Text>
      <TextInput
        style={styles.input}
        value={mobilePhoneNumber}
        onChangeText={setMobilePhoneNumber}
        placeholder="+46701112233"
        keyboardType="phone-pad"
      />

      {roleName === 'PLAYER' ? (
        <View style={styles.parentBox}>
          <Text style={styles.parentTitle}>Lag (måste väljas)</Text>
          <Text style={styles.hint}>
            Skapa lag under fliken Laget om listan är tom.
          </Text>
          {teams.length === 0 ? (
            <Text style={styles.error}>Inga lag än. Öppna fliken Laget först.</Text>
          ) : (
            <View style={styles.modeRow}>
              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => setSelectedTeam(team)}
                  style={[
                    styles.modeButton,
                    selectedTeam?.id === team.id ? styles.modeButtonActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      selectedTeam?.id === team.id ? styles.modeButtonTextActive : null,
                    ]}
                  >
                    {team.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {roleName === 'PLAYER' ? (
        <View style={styles.parentBox}>
          <Text style={styles.parentTitle}>Förälder (måste väljas)</Text>
          <Text style={styles.hint}>
            Sök efter en befintlig förälder, eller skapa en ny tillsammans med spelaren.
          </Text>

          {!createNewParent && !selectedParent ? (
            <>
              <Text style={styles.label}>Sök förälder på namn</Text>
              <TextInput
                style={styles.input}
                value={parentSearch}
                onChangeText={setParentSearch}
                placeholder="Skriv förälderns namn"
              />
              {visibleParentMatches.map((parent) => (
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
                <Text style={styles.secondaryButtonText}>Skapa en ny förälder i stället</Text>
              </Pressable>
            </>
          ) : null}

          {selectedParent ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedText}>
                Selected: {selectedParent.name} ({selectedParent.email})
              </Text>
              <Pressable onPress={resetParentFields}>
                <Text style={styles.clearLink}>Rensa</Text>
              </Pressable>
            </View>
          ) : null}

          {createNewParent ? (
            <View>
              <Text style={styles.label}>Ny förälders namn</Text>
              <TextInput
                style={styles.input}
                value={newParentName}
                onChangeText={setNewParentName}
                placeholder="Förälderns namn"
              />
              <Text style={styles.label}>Ny förälders e-post</Text>
              <TextInput
                style={styles.input}
                value={newParentEmail}
                onChangeText={setNewParentEmail}
                placeholder="foralder@email.se"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.label}>Ny förälders telefon</Text>
              <TextInput
                style={styles.input}
                value={newParentPhone}
                onChangeText={setNewParentPhone}
                placeholder="+4670..."
                keyboardType="phone-pad"
              />
              <Pressable style={styles.secondaryButton} onPress={resetParentFields}>
                <Text style={styles.secondaryButtonText}>Tillbaka till sökningen</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable style={styles.button} onPress={onCreate} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sparar…' : 'Skapa användare'}</Text>
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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontWeight: '600',
    color: colors.onSurface,
    fontSize: 12,
  },
  modeButtonTextActive: {
    color: colors.onPrimary,
  },
  parentBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  parentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  matchRow: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
  },
  matchName: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  matchMeta: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  selectedBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedText: {
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 6,
  },
  clearLink: {
    color: colors.error,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
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
