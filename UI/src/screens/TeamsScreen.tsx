import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import { canCreateTeam, isStaff } from '../auth/roles';
import type { TabParamList } from '../navigation/types';
import {
  Team,
  addTeamCoach,
  listTeamCoaches,
  listTeamPlayers,
  listTeams,
  removeTeamCoach,
} from '../api/teams';
import {
  ClubUser,
  searchByName,
  softDeletePlayer,
  updatePlayer,
} from '../api/users';
import { colors, radius, spacing } from '../theme/colors';

type RosterFilter = 'all' | 'players' | 'coaches';

function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '—';
  }
  return phone;
}

function dialablePhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.replace(/\D/g, '').length < 5) {
    return null;
  }
  return cleaned;
}

async function openPhoneLink(
  kind: 'tel' | 'sms',
  phone: string | null | undefined,
) {
  const number = dialablePhone(phone);
  if (!number) {
    Alert.alert(
      'Saknar nummer',
      'Det finns inget giltigt telefonnummer att använda.',
    );
    return;
  }
  const url = kind === 'tel' ? `tel:${number}` : `sms:${number}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported && Platform.OS !== 'web') {
      Alert.alert(
        'Kunde inte öppna',
        `Den här enheten kan inte öppna ${kind}.`,
      );
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Kunde inte öppna', `Misslyckades att öppna ${url}`);
  }
}

export default function TeamsScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  // Edit roster and add a coach stay as they were. Chairman is included
  // because that role is above coach. Creating a team is a separate check.
  const staff = isStaff(session?.roleName);
  const mayCreateTeam = canCreateTeam(session?.roleName);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [coaches, setCoaches] = useState<ClubUser[]>([]);
  const [players, setPlayers] = useState<ClubUser[]>([]);
  const [coachSearch, setCoachSearch] = useState('');
  const [coachMatches, setCoachMatches] = useState<ClubUser[]>([]);
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewingPlayer, setViewingPlayer] = useState<ClubUser | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editShirt, setEditShirt] = useState('');
  const [editTeamId, setEditTeamId] = useState<number | null>(null);
  const [editParentName, setEditParentName] = useState('');
  const [editParentEmail, setEditParentEmail] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');

  const loadTeams = useCallback(async () => {
    try {
      setTeams(await listTeams());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda lagen.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: selectedTeam == null && viewingPlayer == null,
    });
  }, [navigation, selectedTeam, viewingPlayer]);

  const filteredPlayers = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    const sorted = [...players].sort((a, b) => {
      const an = a.playerNumber ?? 9999;
      const bn = b.playerNumber ?? 9999;
      if (an !== bn) {
        return an - bn;
      }
      return a.name.localeCompare(b.name, 'sv');
    });
    if (!q) {
      return sorted;
    }
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.parentName ?? '').toLowerCase().includes(q) ||
        (p.mobilePhoneNumber ?? '').includes(q) ||
        String(p.playerNumber ?? '').includes(q),
    );
  }, [players, rosterQuery]);

  const filteredCoaches = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) {
      return coaches;
    }
    return coaches.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.mobilePhoneNumber ?? '').includes(q),
    );
  }, [coaches, rosterQuery]);

  async function reloadSelectedTeamMembers(team: Team) {
    const [teamCoaches, teamPlayers] = await Promise.all([
      listTeamCoaches(team.id),
      listTeamPlayers(team.id),
    ]);
    setCoaches(teamCoaches);
    setPlayers(teamPlayers);
  }

  function fillEditFields(player: ClubUser) {
    setEditName(player.name);
    setEditEmail(player.email);
    setEditPhone(player.mobilePhoneNumber ?? '');
    setEditShirt(player.playerNumber != null ? String(player.playerNumber) : '');
    setEditTeamId(player.teamId);
    setEditParentName(player.parentName ?? '');
    setEditParentEmail(player.parentEmail ?? '');
    setEditParentPhone(player.parentMobilePhoneNumber ?? '');
  }

  async function onSelectTeam(team: Team) {
    setSelectedTeam(team);
    setError(null);
    setMessage(null);
    setCoachSearch('');
    setCoachMatches([]);
    setViewingPlayer(null);
    setShowEditForm(false);
    setRosterQuery('');
    setRosterFilter('all');
    setShowAddCoach(false);
    try {
      await reloadSelectedTeamMembers(team);
    } catch (err) {
      setCoaches([]);
      setPlayers([]);
      setError(
        err instanceof Error ? err.message : 'Kunde inte ladda lagets medlemmar.',
      );
    }
  }

  function onBackFromTeam() {
    setSelectedTeam(null);
    setViewingPlayer(null);
    setShowEditForm(false);
    setShowAddCoach(false);
    setToast(null);
  }

  function openPlayer(player: ClubUser) {
    setViewingPlayer(player);
    setShowEditForm(false);
    fillEditFields(player);
    setError(null);
    setMessage(null);
  }

  function onBackFromPlayer() {
    setViewingPlayer(null);
    setShowEditForm(false);
  }

  async function onSavePlayer() {
    if (!viewingPlayer || editTeamId == null) {
      setError('Välj ett lag.');
      return;
    }
    if (!editName.trim()) {
      setError('Fyll i namn.');
      return;
    }
    if (!editEmail.trim()) {
      setError('Fyll i e-post.');
      return;
    }

    let shirt: number | null = null;
    if (editShirt.trim()) {
      shirt = Number(editShirt.trim());
      if (Number.isNaN(shirt)) {
        setError('Tröjnumret måste vara ett tal.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePlayer(viewingPlayer.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        mobilePhoneNumber: editPhone.trim() || null,
        playerNumber: shirt,
        teamId: editTeamId,
        parentId: viewingPlayer.parentId,
        parentName: editParentName.trim() || null,
        parentEmail: editParentEmail.trim() || null,
        parentMobilePhoneNumber: editParentPhone.trim() || null,
      });

      setMessage(`Saved ${updated.name}.`);
      setViewingPlayer(updated);
      setShowEditForm(false);
      fillEditFields(updated);
      await loadTeams();

      if (selectedTeam) {
        if (updated.teamId !== selectedTeam.id) {
          setMessage(
            `Saved ${updated.name}. Moved to ${updated.teamName ?? 'another team'}.`,
          );
          setViewingPlayer(null);
        }
        await reloadSelectedTeamMembers(selectedTeam);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara.');
    } finally {
      setLoading(false);
    }
  }

  async function onRemovePlayer() {
    if (!viewingPlayer) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await softDeletePlayer(viewingPlayer.id);
      setMessage(`Removed ${viewingPlayer.name} (soft delete).`);
      setViewingPlayer(null);
      setShowEditForm(false);
      if (selectedTeam) {
        await reloadSelectedTeamMembers(selectedTeam);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort.');
    } finally {
      setLoading(false);
    }
  }

  async function onSearchCoaches(text: string) {
    setCoachSearch(text);
    const trimmed = text.trim();
    if (trimmed.length < 1) {
      setCoachMatches([]);
      return;
    }
    try {
      const users = await searchByName(trimmed);
      setCoachMatches(users.filter((user) => user.roleName === 'COACH'));
    } catch {
      setCoachMatches([]);
    }
  }

  async function onAddCoach(coach: ClubUser) {
    if (!selectedTeam) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await addTeamCoach(selectedTeam.id, coach.id);
      setMessage(`Added ${coach.name} to ${selectedTeam.name}.`);
      setCoachSearch('');
      setCoachMatches([]);
      setShowAddCoach(false);
      setCoaches(await listTeamCoaches(selectedTeam.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte lägga till tränaren.');
    } finally {
      setLoading(false);
    }
  }

  async function onRemoveCoach(coach: ClubUser) {
    if (!selectedTeam) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await removeTeamCoach(selectedTeam.id, coach.id);
      setMessage(`Removed ${coach.name} from ${selectedTeam.name}.`);
      setCoaches(await listTeamCoaches(selectedTeam.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort tränaren.');
    } finally {
      setLoading(false);
    }
  }

  function onConfirmSaveRoster() {
    setToast(`Roster sparad för ${selectedTeam?.name ?? 'laget'}!`);
    setTimeout(() => setToast(null), 2400);
  }

  // —— Player contact detail ——
  if (viewingPlayer && selectedTeam) {
    const playerPhone = viewingPlayer.mobilePhoneNumber;
    const parentPhone = viewingPlayer.parentMobilePhoneNumber;

    return (
      <View style={styles.rosterRoot}>
        <View style={styles.rosterHeader}>
          <Pressable
            style={styles.headerBtn}
            onPress={onBackFromPlayer}
            hitSlop={8}
          >
            <Text style={styles.headerBtnText}>←</Text>
          </Pressable>
          <Text style={styles.rosterHeaderTitle}>SPELARE</Text>
          {staff ? (
            <Pressable
              style={styles.headerBtn}
              onPress={() => setShowEditForm((v) => !v)}
              hitSlop={8}
            >
              <Text style={styles.headerBtnText}>✎</Text>
            </Pressable>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.playerDetailContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.playerHero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {viewingPlayer.playerNumber ?? '–'}
              </Text>
            </View>
            <Text style={styles.heroName}>{viewingPlayer.name}</Text>
            <Text style={styles.heroMeta}>
              {selectedTeam.name}
              {viewingPlayer.playerNumber != null
                ? ` · #${viewingPlayer.playerNumber}`
                : ''}
            </Text>
          </View>

          <View style={styles.quickActions}>
            <QuickAction
              icon="📞"
              label="Ring"
              onPress={() => openPhoneLink('tel', playerPhone)}
              disabled={!dialablePhone(playerPhone)}
            />
            <QuickAction
              icon="💬"
              label="SMS"
              onPress={() => openPhoneLink('sms', playerPhone)}
              disabled={!dialablePhone(playerPhone)}
            />
            <QuickAction
              icon="👨‍👩‍👧"
              label={'Ring\nförälder'}
              onPress={() => openPhoneLink('tel', parentPhone)}
              disabled={!dialablePhone(parentPhone)}
            />
          </View>

          <View style={styles.contactCard}>
            <Text style={styles.contactCardLabel}>SPELARENS TELEFON</Text>
            <View style={styles.contactCardRow}>
              <View style={styles.contactCardBody}>
                <Text style={styles.contactCardName}>{viewingPlayer.name}</Text>
                <Text style={styles.contactCardPhone}>
                  {formatPhone(playerPhone)}
                </Text>
              </View>
              <Pressable
                style={styles.contactIconBtn}
                onPress={() => openPhoneLink('tel', playerPhone)}
                disabled={!dialablePhone(playerPhone)}
              >
                <Text style={styles.contactIconBtnText}>📞</Text>
              </Pressable>
              <Pressable
                style={styles.contactIconBtn}
                onPress={() => openPhoneLink('sms', playerPhone)}
                disabled={!dialablePhone(playerPhone)}
              >
                <Text style={styles.contactIconBtnText}>💬</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.contactCard}>
            <Text style={styles.contactCardLabel}>FÖRÄLDRAKONTAKT</Text>
            <View style={styles.contactCardRow}>
              <View style={styles.contactCardBody}>
                <Text style={styles.contactCardName}>
                  {viewingPlayer.parentName ?? 'Ingen förälder kopplad'}
                </Text>
                <Text style={styles.contactCardPhone}>
                  {formatPhone(parentPhone)}
                </Text>
              </View>
              <Pressable
                style={styles.contactIconBtn}
                onPress={() => openPhoneLink('tel', parentPhone)}
                disabled={!dialablePhone(parentPhone)}
              >
                <Text style={styles.contactIconBtnText}>📞</Text>
              </Pressable>
              <Pressable
                style={styles.contactIconBtn}
                onPress={() => openPhoneLink('sms', parentPhone)}
                disabled={!dialablePhone(parentPhone)}
              >
                <Text style={styles.contactIconBtnText}>💬</Text>
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}

          {showEditForm && staff ? (
            <View style={styles.detailBox}>
              <Text style={styles.detailTitle}>Redigera spelare</Text>

              <Text style={styles.label}>Namn</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.label}>E-post</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Tröjnummer</Text>
              <TextInput
                style={styles.input}
                value={editShirt}
                onChangeText={setEditShirt}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Lag</Text>
              <View style={styles.modeRow}>
                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => setEditTeamId(team.id)}
                    style={[
                      styles.modeButton,
                      editTeamId === team.id ? styles.modeButtonActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        editTeamId === team.id
                          ? styles.modeButtonTextActive
                          : null,
                      ]}
                    >
                      {team.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Föräldernamn</Text>
              <TextInput
                style={styles.input}
                value={editParentName}
                onChangeText={setEditParentName}
              />

              <Text style={styles.label}>Förälderns e-post</Text>
              <TextInput
                style={styles.input}
                value={editParentEmail}
                onChangeText={setEditParentEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Förälderns telefon</Text>
              <TextInput
                style={styles.input}
                value={editParentPhone}
                onChangeText={setEditParentPhone}
                keyboardType="phone-pad"
              />

              <Pressable
                style={styles.dangerButton}
                onPress={onRemovePlayer}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Ta bort spelare</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {staff ? (
          <View style={styles.stickyBar}>
            <Pressable
              style={styles.saveBtn}
              onPress={showEditForm ? onSavePlayer : () => setShowEditForm(true)}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>
                {showEditForm
                  ? loading
                    ? 'Sparar…'
                    : 'Spara ändringar'
                  : 'Redigera spelare'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  // —— Team detail (lagroster) ——
  if (selectedTeam) {
    const showPlayers =
      rosterFilter === 'all' || rosterFilter === 'players';
    const showCoaches =
      rosterFilter === 'all' || rosterFilter === 'coaches';

    return (
      <View style={styles.rosterRoot}>
        <View style={styles.rosterHeader}>
          <Pressable
            style={styles.headerBtn}
            onPress={onBackFromTeam}
            hitSlop={8}
          >
            <Text style={styles.headerBtnText}>←</Text>
          </Pressable>
          <Text style={styles.rosterHeaderTitle}>LAGROSTER</Text>
          <View style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>🔍</Text>
          </View>
        </View>

        <View style={styles.teamBanner}>
          <Text style={styles.teamBannerTitle}>{selectedTeam.name}</Text>
          <Text style={styles.teamBannerMeta}>
            {players.length} spelare · {coaches.length} tränare
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={rosterQuery}
            onChangeText={setRosterQuery}
            placeholder="Sök spelare i laget…"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'Alla' },
              { key: 'players', label: 'Spelare' },
              { key: 'coaches', label: 'Tränare' },
            ] as const
          ).map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                rosterFilter === f.key ? styles.filterChipActive : null,
              ]}
              onPress={() => setRosterFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  rosterFilter === f.key ? styles.filterChipTextActive : null,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={[styles.error, styles.gutter]}>{error}</Text> : null}
        {message ? (
          <Text style={[styles.success, styles.gutter]}>{message}</Text>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.rosterList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showPlayers
            ? filteredPlayers.map((player) => (
                <Pressable
                  key={player.id}
                  style={styles.memberCard}
                  onPress={() => openPlayer(player)}
                >
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>
                      {player.playerNumber ?? '–'}
                    </Text>
                  </View>
                  <View style={styles.memberBody}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={styles.memberSub} numberOfLines={1}>
                      Förälder: {player.parentName ?? '—'}
                    </Text>
                    <View style={styles.phoneRow}>
                      <Text style={styles.phoneIcon}>📞</Text>
                      <Text style={styles.phoneText}>
                        {formatPhone(player.mobilePhoneNumber)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))
            : null}

          {showPlayers && filteredPlayers.length === 0 ? (
            <Text style={styles.hint}>Inga spelare att visa.</Text>
          ) : null}

          {showCoaches
            ? filteredCoaches.map((coach) => (
                <View key={coach.id} style={styles.memberCard}>
                  <View style={[styles.numberBadge, styles.coachBadge]}>
                    <Text style={styles.numberBadgeText}>T</Text>
                  </View>
                  <View style={styles.memberBody}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {coach.name}
                    </Text>
                    <Text style={styles.memberSub} numberOfLines={1}>
                      Tränare · {coach.email}
                    </Text>
                    <View style={styles.phoneRow}>
                      <Text style={styles.phoneIcon}>📞</Text>
                      <Text style={styles.phoneText}>
                        {formatPhone(coach.mobilePhoneNumber)}
                      </Text>
                    </View>
                  </View>
                  {staff ? (
                    <Pressable onPress={() => onRemoveCoach(coach)} hitSlop={8}>
                      <Text style={styles.clearLink}>Ta bort</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </View>
              ))
            : null}

          {showCoaches && filteredCoaches.length === 0 ? (
            <Text style={styles.hint}>Inga tränare att visa.</Text>
          ) : null}

          {showAddCoach && staff ? (
            <View style={styles.detailBox}>
              <Text style={styles.detailTitle}>Lägg till tränare</Text>
              <TextInput
                style={styles.input}
                value={coachSearch}
                onChangeText={onSearchCoaches}
                placeholder="Sök tränare på namn"
              />
              {coachMatches.map((coach) => (
                <Pressable
                  key={coach.id}
                  style={styles.matchRow}
                  onPress={() => onAddCoach(coach)}
                >
                  <Text style={styles.matchName}>{coach.name}</Text>
                  <Text style={styles.matchMeta}>{coach.email}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowAddCoach(false)}
              >
                <Text style={styles.secondaryButtonText}>Stäng</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {staff ? (
          <Pressable
            style={styles.fab}
            onPress={() => {
              setShowAddCoach(true);
              setViewingPlayer(null);
            }}
          >
            <Text style={styles.fabText}>＋</Text>
          </Pressable>
        ) : null}

        <View style={styles.stickyBar}>
          <Pressable style={styles.saveBtn} onPress={onConfirmSaveRoster}>
            <Text style={styles.saveBtnText}>Spara roster</Text>
          </Pressable>
        </View>

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // —— Team list ——
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Laget</Text>
      <Text style={styles.hint}>Välj ett lag för att öppna roster.</Text>

      {mayCreateTeam ? (
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('CreateTeam')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Skapa lag</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.label, styles.sectionGap]}>Alla lag</Text>
      {teams.length === 0 ? (
        <Text style={styles.hint}>Inga lag ännu.</Text>
      ) : null}
      {teams.map((team) => (
        <Pressable
          key={team.id}
          style={styles.teamRow}
          onPress={() => onSelectTeam(team)}
        >
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.quickAction, disabled ? styles.quickActionDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.quickActionIcon}>
        <Text style={styles.quickActionIconText}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.gutter,
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
  sectionGap: {
    marginTop: 20,
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
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '700',
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
  teamRow: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    fontWeight: '700',
    fontSize: 16,
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
  matchRow: {
    backgroundColor: colors.surfaceContainer,
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
  clearLink: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 13,
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
  gutter: {
    paddingHorizontal: spacing.gutter,
  },

  rosterRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rosterHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  rosterHeaderTitle: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  teamBanner: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  teamBannerTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.onSurface,
  },
  teamBannerMeta: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  searchWrap: {
    marginHorizontal: spacing.gutter,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  rosterList: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 76,
  },
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBadge: {
    backgroundColor: colors.tertiary,
  },
  numberBadgeText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.onSurface,
  },
  memberSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneIcon: {
    fontSize: 11,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  chevron: {
    fontSize: 22,
    color: colors.onSurfaceVariant,
    fontWeight: '300',
  },
  detailBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: spacing.gutter,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
    marginTop: -2,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    paddingBottom: 16,
  },
  saveBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inverseSurface,
    borderRadius: radius.full,
  },
  toastText: {
    color: colors.inverseOnSurface,
    fontSize: 13,
    fontWeight: '700',
  },

  // Player contact
  playerDetailContent: {
    padding: spacing.gutter,
    paddingBottom: 120,
  },
  playerHero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  heroBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    color: colors.onPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionDisabled: {
    opacity: 0.4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconText: {
    fontSize: 22,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  contactCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  contactCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactCardBody: {
    flex: 1,
    minWidth: 0,
  },
  contactCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  contactCardPhone: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  contactIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconBtnText: {
    fontSize: 18,
  },
});
