import { StyleSheet, Text, View } from 'react-native';
import type { ClubUser } from '../../api/users';
import { Button, Screen } from '../ui';
import { spacing, type } from '../../theme';

/**
 * CreatedAccounts: shown after "Ny spelare" (#97) or "Ny användare" (#99) saves.
 * The server sends each new account's temporary password once, in the create
 * response. Nobody can log in without it, so the creator reads it here and
 * hands it over. It is never shown again.
 */

/** One new account: who it is, and the password they log in with the first time. */
export type CreatedAccount = {
  name: string;
  temporaryPassword: string | null;
};

/** The new user, plus the new parent when one was created together with a player. */
export function createdAccounts(created: ClubUser): CreatedAccount[] {
  const accounts: CreatedAccount[] = [
    { name: created.name, temporaryPassword: created.temporaryPassword ?? null },
  ];
  if (created.parentTemporaryPassword) {
    accounts.push({
      name: created.parentName ?? '',
      temporaryPassword: created.parentTemporaryPassword,
    });
  }
  return accounts;
}

type Props = {
  accounts: readonly CreatedAccount[];
  /** "Klar": usually navigation.goBack(). */
  onDone: () => void;
};

export function CreatedAccounts({ accounts, onDone }: Props) {
  return (
    <Screen title="Konto skapat" bottom={<Button title="Klar" block onPress={onDone} />}>
      <View style={styles.list}>
        {accounts.map((account, index) => (
          <View key={index} style={styles.account}>
            <Text style={type.body}>{account.name}</Text>
            {account.temporaryPassword ? (
              <Text selectable style={type.body}>
                Tillfälligt lösenord: {account.temporaryPassword}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.page, gap: spacing.lg },
  account: { gap: spacing.xs },
});
