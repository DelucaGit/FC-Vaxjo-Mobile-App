import { StyleSheet, Text, View } from 'react-native';
import { Field } from '../ui';
import { colors, spacing, type } from '../../theme';
import type { TrainingFormValues } from './trainingValues';

type Props = {
  values: TrainingFormValues;
  onChange: (values: TrainingFormValues) => void;
};

/** The fields shared by "Ny träning" and "Redigera träning". "Spara" lives in the screen. */
export function TrainingForm({ values, onChange }: Props) {
  const set = (key: keyof TrainingFormValues) => (text: string) =>
    onChange({ ...values, [key]: text });

  return (
    <View style={styles.form}>
      <Field
        label="Datum"
        value={values.date}
        onChangeText={set('date')}
        placeholder="ÅÅÅÅ-MM-DD"
        keyboardType="numbers-and-punctuation"
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <Field
            label="Start"
            value={values.start}
            onChangeText={set('start')}
            placeholder="TT:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.half}>
          <Field
            label="Slut"
            value={values.end}
            onChangeText={set('end')}
            placeholder="TT:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <Field label="Plats (valfri)" value={values.venue} onChangeText={set('venue')} />
    </View>
  );
}

/** A server or network error, in the warning color. */
export function ErrorText({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={[type.body, styles.error]}>{message}</Text>;
}

const styles = StyleSheet.create({
  form: { gap: spacing.page, padding: spacing.page },
  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  error: { color: colors.warning, paddingHorizontal: spacing.page, paddingTop: spacing.page },
});
