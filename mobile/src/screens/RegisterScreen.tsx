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
import { colors, spacing } from '../theme';

type Props = {
  onGoLogin: () => void;
};

export function RegisterScreen({ onGoLogin }: Props) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Parent signup</Text>
        <Text style={styles.subtitle}>Create a parent account for FC Växjö</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>First name</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

        <Text style={styles.label}>Last name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password (min 8)</Text>
        <TextInput secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <Pressable onPress={onGoLogin}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.pitchLight,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: '#D7E8DF',
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
  },
});
