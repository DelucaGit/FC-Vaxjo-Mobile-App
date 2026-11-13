import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { Weekday } from '../../api/trainings';
import { WEEKDAYS } from '../../lib/activities/trainingSeries';
import { colors, radius, sizes, spacing, type } from '../../theme';
import { Field } from '../ui';

export type RepeatValues = {
  on: boolean;
  weekdays: Weekday[];
  /** "2026-12-20", the last day of the series (included). */
  endDate: string;
};

export const REPEAT_OFF: RepeatValues = { on: false, weekdays: [], endDate: '' };

type Props = {
  values: RepeatValues;
  onChange: (values: RepeatValues) => void;
};

/**
 * "Upprepa varje vecka" on "Ny träning" (issue #132).
 * Off: nothing more is shown. On: weekday buttons (several may be chosen) and an end date.
 */
export function RepeatWeekly({ values, onChange }: Props) {
  const toggleDay = (day: Weekday) => {
    const weekdays = values.weekdays.includes(day)
      ? values.weekdays.filter((d) => d !== day)
      : [...values.weekdays, day];
    onChange({ ...values, weekdays });
  };

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={type.body}>Upprepa varje vecka</Text>
        <Switch
          accessibilityLabel="Upprepa varje vecka"
          value={values.on}
          onValueChange={(on) => onChange({ ...values, on })}
          trackColor={{ true: colors.primary }}
        />
      </View>
      {values.on && (
        <>
          <View accessibilityLabel="Veckodagar" style={styles.days}>
            {WEEKDAYS.map((day) => {
              const active = values.weekdays.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day.label}
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleDay(day.value)}
                  style={[styles.day, active && styles.dayActive]}
                >
                  <Text style={[type.button, active ? styles.activeText : styles.text]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Slutdatum"
            value={values.endDate}
            onChangeText={(endDate) => onChange({ ...values, endDate })}
            placeholder="ÅÅÅÅ-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.page, paddingHorizontal: spacing.page },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: {
    flex: 1,
    minHeight: sizes.segment,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text },
  activeText: { color: colors.onPrimary },
});
