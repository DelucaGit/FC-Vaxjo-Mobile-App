import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Team } from '../api/teams';
import { deletePlayer, getUser, updatePlayer, type ClubUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { Button, Confirm, Field, Screen, SectionLabel, SelectField, useToast } from '../components/ui';
import { parseShirtNumber, playerSaveErrorMessage } from '../lib/players/errors';
import { loadVisibleTeams } from '../lib/players/teams';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'PlayerProfile'>;

/**
 * Spelarprofil (spec section 7). The only screen that edits or removes a user.
 * The parent's contact details are edited here too and saved on the parent.
 */
export default function PlayerProfileScreen({ navigation, route }: Props) {
  const toast = useToast();
  const { userId } = route.params;
  const role = useAuth().session?.roleName;

  const [player, setPlayer] = useState<ClubUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shirt, setShirt] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getUser(userId), loadVisibleTeams(role)])
      .then(([user, visible]) => {
        if (!active) return;
        setPlayer(user);
        setTeams(visible);
        setName(user.name);
        setEmail(user.email);
        setPhone(user.mobilePhoneNumber ?? '');
        setShirt(user.playerNumber == null ? '' : String(user.playerNumber));
        setTeamId(user.teamId);
        setParentName(user.parentName ?? '');
        setParentPhone(user.parentMobilePhoneNumber ?? '');
        setParentEmail(user.parentEmail ?? '');
      })
      .catch((e) => {
        if (active) setError(playerSaveErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [userId, role]);

  const hasParent = player?.parentId != null;
  const shirtNumber = parseShirtNumber(shirt);
  const valid =
    player != null &&
    name.trim() !== '' &&
    email.trim() !== '' &&
    teamId != null &&
    shirtNumber !== undefined;

  async function save() {
    if (!valid || teamId == null) return;
    setBusy(true);
    setError(null);
    try {
      await updatePlayer(userId, {
        name: name.trim(),
        email: email.trim(),
        mobilePhoneNumber: phone.trim() || null,
        playerNumber: shirtNumber ?? null,
        teamId,
        // Only sent when the player has a parent; the server writes them on the parent row.
        // A blank parent name or email is left out, so the old value stays.
        ...(hasParent
          ? {
              parentName: parentName.trim() || null,
              parentEmail: parentEmail.trim() || null,
              parentMobilePhoneNumber: parentPhone.trim(),
            }
          : {}),
      });
      toast.show('Spelaren är sparad');
      navigation.goBack();
    } catch (e) {
      setError(playerSaveErrorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    setConfirmDelete(false);
    setBusy(true);
    setError(null);
    try {
      await deletePlayer(userId);
      toast.show('Spelaren är borttagen');
      navigation.goBack();
    } catch (e) {
      setError(playerSaveErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen
      title="Spelare"
      onBack={() => navigation.goBack()}
      bottom={<Button title="Spara" block disabled={!valid || busy} onPress={save} />}
    >
      <View style={styles.fields}>
        <Field label="Namn" value={name} onChangeText={setName} />
        <Field
          label="E-post"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field
          label="Tröjnummer (valfritt)"
          value={shirt}
          onChangeText={setShirt}
          keyboardType="number-pad"
        />
        <SelectField
          label="Lag"
          value={teamId}
          options={teams.map((t) => ({ label: t.name, value: t.id }))}
          onChange={setTeamId}
        />
      </View>

      {hasParent ? (
        <>
          <SectionLabel title="Förälder" />
          <View style={styles.fields}>
            <Field
              label="Namn"
              accessibilityLabel="Förälderns namn"
              value={parentName}
              onChangeText={setParentName}
            />
            <Field
              label="Telefon"
              accessibilityLabel="Förälderns telefon"
              value={parentPhone}
              onChangeText={setParentPhone}
              keyboardType="phone-pad"
            />
            <Field
              label="E-post"
              accessibilityLabel="Förälderns e-post"
              value={parentEmail}
              onChangeText={setParentEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {player ? (
        <View style={styles.fields}>
          <Button
            title="Ta bort spelare"
            variant="danger"
            block
            disabled={busy}
            onPress={() => setConfirmDelete(true)}
          />
        </View>
      ) : null}

      <Confirm
        visible={confirmDelete}
        title="Ta bort spelare?"
        message="Spelaren blir inaktiv. Gammal närvaro sparas."
        confirmLabel="Ta bort"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: { padding: spacing.page, gap: spacing.md },
  error: { ...type.body, color: colors.warning, paddingHorizontal: spacing.page },
});
