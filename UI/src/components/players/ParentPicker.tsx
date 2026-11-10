import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { listTeamPlayers, type Team } from '../../api/teams';
import { listUsers, type NewParentInput } from '../../api/users';
import { isClubWide } from '../../auth/permissions';
import { Empty, Field, List, Row, RowMeta, RowTitle, Segmented } from '../ui';
import { colors, spacing } from '../../theme';

/**
 * ParentPicker: choose exactly one parent for a new player.
 * Used by "Ny spelare" (#97) and "Ny användare" (#99).
 *
 * How to use it:
 *   const [parent, setParent] = useState<ParentChoice>(EMPTY_PARENT_CHOICE);
 *   const parents = await loadParentOptions(role, ownTeams);   // once, on load
 *   <ParentPicker parents={parents} value={parent} onChange={setParent} />
 *   const link = parentRequest(parent);   // null until the choice is complete
 *   createUser({ ...player, ...link });   // sends parentId OR newParent, never both
 *
 * The picker is controlled: the screen owns the value, the picker only draws it.
 */

/** One parent in the "Välj befintlig" list. */
export type ParentOption = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

export type ParentMode = 'existing' | 'new';

/** Both halves are kept, so switching tabs does not wipe what was typed. */
export type ParentChoice = {
  mode: ParentMode;
  parentId: number | null;
  newParent: NewParentInput;
};

export const EMPTY_PARENT_CHOICE: ParentChoice = {
  mode: 'existing',
  parentId: null,
  newParent: { name: '', email: '', mobilePhoneNumber: '' },
};

/** The part of CreateUserInput that links the parent, or null if not complete yet. */
export function parentRequest(
  choice: ParentChoice,
): { parentId: number } | { newParent: NewParentInput } | null {
  if (choice.mode === 'existing') {
    return choice.parentId == null ? null : { parentId: choice.parentId };
  }
  const newParent = {
    name: choice.newParent.name.trim(),
    email: choice.newParent.email.trim(),
    mobilePhoneNumber: choice.newParent.mobilePhoneNumber.trim(),
  };
  if (!newParent.name || !newParent.email || !newParent.mobilePhoneNumber) {
    return null;
  }
  return { newParent };
}

/**
 * Parents the logged-in person may link to.
 * ADMIN and CHAIRMAN: every active PARENT in the club.
 * COACH: only parents of players on their own teams (e.g. a sibling),
 * because a coach may not list the club's users.
 */
export async function loadParentOptions(
  role: string | null | undefined,
  ownTeams: readonly Pick<Team, 'id'>[],
): Promise<ParentOption[]> {
  if (isClubWide(role)) {
    const users = await listUsers();
    return users
      .filter((u) => u.roleName === 'PARENT' && u.active)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.mobilePhoneNumber }))
      .sort(byName);
  }

  const rosters = await Promise.all(ownTeams.map((team) => listTeamPlayers(team.id)));
  const byId = new Map<number, ParentOption>();
  for (const player of rosters.flat()) {
    if (player.parentId != null && !byId.has(player.parentId)) {
      byId.set(player.parentId, {
        id: player.parentId,
        name: player.parentName ?? '',
        email: player.parentEmail,
        phone: player.parentMobilePhoneNumber,
      });
    }
  }
  return [...byId.values()].sort(byName);
}

function byName(a: ParentOption, b: ParentOption): number {
  return a.name.localeCompare(b.name, 'sv');
}

type Props = {
  /** From loadParentOptions. */
  parents: readonly ParentOption[];
  value: ParentChoice;
  onChange: (value: ParentChoice) => void;
};

const MODES = [
  { label: 'Välj befintlig', value: 'existing' },
  { label: 'Skapa ny', value: 'new' },
] as const;

export function ParentPicker({ parents, value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? parents.filter((p) => p.name.toLowerCase().includes(needle)) : parents;

  function setNew(patch: Partial<NewParentInput>) {
    onChange({ ...value, newParent: { ...value.newParent, ...patch } });
  }

  return (
    <View style={styles.root}>
      <View style={styles.pad}>
        <Segmented
          accessibilityLabel="Förälder"
          options={MODES}
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
        />
      </View>

      {value.mode === 'existing' ? (
        <>
          <View style={styles.pad}>
            <Field label="Sök förälder" value={query} onChangeText={setQuery} />
          </View>
          {shown.length === 0 ? (
            <Empty text="Inga föräldrar" />
          ) : (
            <List>
              {shown.map((parent) => {
                const selected = parent.id === value.parentId;
                return (
                  <Row
                    key={parent.id}
                    testID={`parent-${parent.id}`}
                    onPress={() => onChange({ ...value, parentId: parent.id })}
                    right={
                      selected ? <Check size={20} color={colors.primary} strokeWidth={2} /> : null
                    }
                  >
                    <RowTitle>{parent.name}</RowTitle>
                    {parent.email || parent.phone ? (
                      <RowMeta>{[parent.phone, parent.email].filter(Boolean).join(' · ')}</RowMeta>
                    ) : null}
                  </Row>
                );
              })}
            </List>
          )}
        </>
      ) : (
        <View style={[styles.pad, styles.fields]}>
          <Field
            label="Namn"
            accessibilityLabel="Förälderns namn"
            value={value.newParent.name}
            onChangeText={(name) => setNew({ name })}
          />
          <Field
            label="E-post"
            accessibilityLabel="Förälderns e-post"
            value={value.newParent.email}
            onChangeText={(email) => setNew({ email })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Telefon"
            accessibilityLabel="Förälderns telefon"
            value={value.newParent.mobilePhoneNumber}
            onChangeText={(mobilePhoneNumber) => setNew({ mobilePhoneNumber })}
            keyboardType="phone-pad"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  pad: { paddingHorizontal: spacing.page },
  fields: { gap: spacing.md },
});
