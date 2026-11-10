import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createTeam } from '../api/teams';
import { ErrorText } from '../components/teams/ErrorText';
import { errorMessage } from '../components/teams/errors';
import { Button, Field, Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTeam'>;

/** Nytt lag (spec section 7): "Spara" stays locked until the name is filled in. */
export default function NewTeamScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function save() {
    setSaving(true);
    try {
      await createTeam(trimmed);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Nytt lag"
      onBack={() => navigation.goBack()}
      bottom={
        <Button
          title="Spara"
          block
          disabled={trimmed.length === 0 || saving}
          onPress={() => void save()}
        />
      }
    >
      <View style={styles.form}>
        <Field label="Lagnamn" value={name} onChangeText={setName} autoFocus />
      </View>
      <ErrorText message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.page },
});
