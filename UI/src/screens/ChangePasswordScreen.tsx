import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { ChangePasswordForm } from '../components/account/ChangePasswordForm';
import { Button, Screen } from '../components/ui';
import { spacing } from '../theme';

/**
 * "Byt lösenord vid första inloggning" (spec section 7).
 * App.tsx shows it instead of the tabs while the account has a temporary password,
 * so there is no bottom menu and no back arrow. When the API accepts the new
 * password, AuthContext updates the session and App.tsx moves on to the tabs.
 */
export default function ChangePasswordScreen() {
  const { logout } = useAuth();

  return (
    <Screen title="Byt lösenord">
      <View style={styles.body}>
        <ChangePasswordForm />
        <Button title="Logga ut" variant="link" onPress={() => logout()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.page, gap: spacing.md },
});
