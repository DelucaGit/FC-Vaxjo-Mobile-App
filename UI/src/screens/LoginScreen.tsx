import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { Button, Field } from '../components/ui';
import { accountErrorMessage } from '../lib/account/messages';
import { colors, spacing, type } from '../theme';

const logo = require('../../assets/icon.png');

/** Login (spec section 7). No "Visa som" buttons: the role comes from the account. */
export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLogin = email.trim().length > 0 && password.length > 0 && !loading;

  async function onLogin() {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(accountErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
          <Text accessibilityRole="header" style={styles.title}>
            FC Växjö
          </Text>
          <View style={styles.form}>
            <Field
              label="E-post"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Lösenord"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Logga in" onPress={onLogin} disabled={!canLogin} block />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.page },
  logo: { width: 112, height: 112, alignSelf: 'center' },
  title: {
    ...type.screenTitle,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 28 * 0.02,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  form: { gap: spacing.md },
  error: { ...type.body, color: colors.warning },
});
