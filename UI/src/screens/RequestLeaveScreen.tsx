import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createLeaveRequest, type LeaveReasonType } from '../api/leaveRequests';
import { ErrorText } from '../components/activities/TrainingForm';
import { Button, Screen, SectionLabel, TextArea, useToast } from '../components/ui';
import { activityDateLabel } from '../lib/dates';
import { LEAVE_REASONS } from '../lib/leave/leaveLabels';
import { MIN_OTHER_TEXT, validateLeaveRequest } from '../lib/leave/validateLeaveRequest';
import type { AppStackParamList } from '../navigation/types';
import { colors, fonts, radii, sizes, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'RequestLeave'>;

/**
 * "Begär ledigt" (issue #211): the player or parent picks an orsak for one upcoming
 * activity and sends it to the coach. Annat needs a short text of its own.
 * After sending, the start page shows "Väntar på svar" on the activity.
 */
export default function RequestLeaveScreen({ navigation, route }: Props) {
  const { kind, id, playerUserId, title, startsAt, endsAt, forName } = route.params;
  const toast = useToast();
  const [reasonType, setReasonType] = useState<LeaveReasonType | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOther = reasonType === 'OTHER';

  const submit = async () => {
    const invalid = validateLeaveRequest({ reasonType, reasonText });
    if (invalid || reasonType == null) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createLeaveRequest({
        ...(kind === 'training' ? { trainingId: id } : { matchId: id }),
        ...(playerUserId != null ? { playerUserId } : {}),
        reasonType,
        reasonText: isOther ? reasonText.trim() : null,
      });
      toast.show('Begäran är skickad');
      // Back to the start page, which reloads on focus and shows the status.
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Begär ledigt"
      onBack={() => navigation.goBack()}
      bottom={<Button title="Skicka" style={styles.grow} disabled={saving} onPress={submit} />}
    >
      <View style={styles.activity}>
        {forName ? <Text style={type.meta}>{`För ${forName}`}</Text> : null}
        <Text style={type.rowTitle}>{title}</Text>
        <Text style={type.meta}>{activityDateLabel(startsAt, endsAt)}</Text>
      </View>
      <SectionLabel title="Orsak" />
      <View style={styles.options}>
        {LEAVE_REASONS.map((reason) => {
          const selected = reason.value === reasonType;
          return (
            <Pressable
              key={reason.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                setReasonType(reason.value);
                setError(null);
              }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {reason.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {isOther ? (
        <View style={styles.text}>
          <TextArea
            label={`Skriv orsak (minst ${MIN_OTHER_TEXT} tecken)`}
            value={reasonText}
            onChangeText={setReasonText}
          />
        </View>
      ) : null}
      <Text style={styles.hint}>Tränaren svarar på din begäran.</Text>
      <ErrorText message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  activity: { gap: spacing.xs, padding: spacing.page },
  options: { gap: spacing.sm, paddingHorizontal: spacing.page },
  option: {
    minHeight: sizes.touch + 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
  },
  optionSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  optionText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  optionTextSelected: { color: colors.primary },
  text: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
  hint: { ...type.meta, paddingHorizontal: spacing.page, paddingTop: spacing.md },
});
