import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../api/client';
import { colors, spacing } from '../theme';

type Props = {
  onGoRegister: () => void;
};

export function LoginScreen({ onGoRegister }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@fcvaxjo.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>FC Växjö</Text>
        <Text style={styles.tagline}>Club app for players, parents, and coaches</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor={colors.muted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </Pressable>

        <Pressable onPress={onGoRegister}>
          <Text style={styles.link}>Parent? Create an account</Text>
        </Pressable>

        <Text style={styles.meta}>API: {getApiBaseUrl()}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  hero: {
    backgroundColor: colors.pitch,
    paddingHorizontal: spacing.lg,
    paddingTop: 72,
    paddingBottom: spacing.xl,
  },
  brand: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: spacing.sm,
    color: '#D7E8DF',
    fontSize: 16,
    maxWidth: 280,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.ink,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.pitch,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    marginTop: spacing.md,
    color: colors.pitchLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    marginTop: spacing.xs,
  },
  meta: {
    marginTop: spacing.lg,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});
