import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Team } from '../api/teams';
import { createUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
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
import { Button, Field, Screen, SectionLabel, SelectField } from '../components/ui';
import { parseShirtNumber, playerSaveErrorMessage } from '../lib/players/errors';
import { loadVisibleTeams } from '../lib/players/teams';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewPlayer'>;

/** Ny spelare (spec section 7): a player always gets exactly one parent. */
export default function NewPlayerScreen({ navigation, route }: Props) {
  const role = useAuth().session?.roleName;
  const startTeamId = route.params?.teamId ?? null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shirt, setShirt] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [parent, setParent] = useState<ParentChoice>(EMPTY_PARENT_CHOICE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedAccount[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const visible = await loadVisibleTeams(role);
        const options = await loadParentOptions(role, visible);
        if (!active) return;
        setTeams(visible);
        setParents(options);
        if (startTeamId != null && visible.some((t) => t.id === startTeamId)) {
          setTeamId(startTeamId);
        }
      } catch (e) {
        if (active) setError(playerSaveErrorMessage(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [role, startTeamId]);

  const shirtNumber = parseShirtNumber(shirt);
  const parentLink = parentRequest(parent);
  const valid =
    name.trim() !== '' &&
    email.trim() !== '' &&
    teamId != null &&
    shirtNumber !== undefined &&
    parentLink != null;

  async function save() {
    if (!valid || teamId == null || parentLink == null) return;
    setSaving(true);
    setError(null);
    try {
      const user = await createUser({
        name: name.trim(),
        email: email.trim(),
        roleName: 'PLAYER',
        mobilePhoneNumber: phone.trim() || null,
        playerNumber: shirtNumber ?? null,
        teamId,
        ...parentLink,
      });
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
      title="Ny spelare"
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

      <SectionLabel title="Förälder" />
      <ParentPicker parents={parents} value={parent} onChange={setParent} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: { padding: spacing.page, gap: spacing.md },
  error: { ...type.body, color: colors.warning, padding: spacing.page },
});
