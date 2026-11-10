import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Team } from '../api/teams';
import { createUser, type CreateUserInput } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { assignableRoles } from '../auth/permissions';
import { roleLabel, type ClubRoleName } from '../auth/roles';
import {
  CreatedAccounts,
  createdAccounts,
  type CreatedAccount,
} from '../components/players/CreatedAccounts';
import {
  EMPTY_PARENT_CHOICE,
  loadParentOptions,
  ParentPicker,
  parentRequest,
  type ParentChoice,
  type ParentOption,
} from '../components/players/ParentPicker';
import { Button, Field, Screen, SectionLabel, Segmented, SelectField } from '../components/ui';
import { parseShirtNumber, playerSaveErrorMessage } from '../lib/players/errors';
import { loadVisibleTeams } from '../lib/players/teams';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewUser'>;

/** Up to this many roles fit side by side; more become a dropdown (spec section 7). */
const MAX_SEGMENTS = 3;

/**
 * Ny användare (spec section 7). ADMIN may pick all five roles, CHAIRMAN
 * Spelare, Förälder and Tränare. A player also needs a team and one parent,
 * a coach gets teams later ("Lägg till tränare"), a parent only base fields.
 */
export default function NewUserScreen({ navigation }: Props) {
  const role = useAuth().session?.roleName;
  const roles = assignableRoles(role);
  const roleOptions = roles.map((r) => ({ label: roleLabel(r), value: r }));

  const [teams, setTeams] = useState<Team[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newRole, setNewRole] = useState<ClubRoleName | null>(null);
  const [shirt, setShirt] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [parent, setParent] = useState<ParentChoice>(EMPTY_PARENT_CHOICE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedAccount[] | null>(null);

  // Teams and parents are only needed for a player, but loading them up front
  // keeps the form simple and switching role instant.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const visible = await loadVisibleTeams(role);
        const options = await loadParentOptions(role, visible);
        if (!active) return;
        setTeams(visible);
        setParents(options);
      } catch (e) {
        if (active) setError(playerSaveErrorMessage(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [role]);

  const isPlayer = newRole === 'PLAYER';
  const shirtNumber = parseShirtNumber(shirt);
  const parentLink = parentRequest(parent);
  const baseValid = name.trim() !== '' && email.trim() !== '' && newRole != null;
  const playerValid = teamId != null && shirtNumber !== undefined && parentLink != null;
  const valid = baseValid && (!isPlayer || playerValid);

  function buildRequest(): CreateUserInput | null {
    if (!valid || newRole == null) return null;
    const base = {
      name: name.trim(),
      email: email.trim(),
      roleName: newRole,
      mobilePhoneNumber: phone.trim() || null,
    };
    if (!isPlayer) return base;
    if (teamId == null || parentLink == null) return null;
    return { ...base, playerNumber: shirtNumber ?? null, teamId, ...parentLink };
  }

  async function save() {
    const request = buildRequest();
    if (request == null) return;
    setSaving(true);
    setError(null);
    try {
      const user = await createUser(request);
      setCreated(createdAccounts(user));
    } catch (e) {
      setError(playerSaveErrorMessage(e));
      setSaving(false);
    }
  }

  if (created) {
    return <CreatedAccounts accounts={created} onDone={() => navigation.goBack()} />;
  }

  return (
    <Screen
      title="Ny användare"
      onBack={() => navigation.goBack()}
      bottom={<Button title="Spara" block disabled={!valid || saving} onPress={save} />}
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
        <Field label="Telefon (valfri)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {roles.length <= MAX_SEGMENTS ? (
          <View style={styles.field}>
            <Text style={styles.label}>Roll</Text>
            <Segmented
              accessibilityLabel="Roll"
              options={roleOptions}
              value={newRole}
              onChange={setNewRole}
            />
          </View>
        ) : (
          <SelectField label="Roll" value={newRole} options={roleOptions} onChange={setNewRole} />
        )}
        {isPlayer ? (
          <>
            <SelectField
              label="Lag"
              value={teamId}
              options={teams.map((t) => ({ label: t.name, value: t.id }))}
              onChange={setTeamId}
            />
            <Field
              label="Tröjnummer (valfritt)"
              value={shirt}
              onChangeText={setShirt}
              keyboardType="number-pad"
            />
          </>
        ) : null}
      </View>

      {isPlayer ? (
        <>
          <SectionLabel title="Förälder" />
          <ParentPicker parents={parents} value={parent} onChange={setParent} />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: { padding: spacing.page, gap: spacing.md },
  // Same look as the label inside Field.
  field: { gap: spacing.xs },
  label: { ...type.meta, color: colors.text },
  error: { ...type.body, color: colors.warning, padding: spacing.page },
});
