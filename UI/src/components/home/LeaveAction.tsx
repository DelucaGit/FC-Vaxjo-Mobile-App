import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LeaveRequestStatus } from '../../api/leaveRequests';
import { leaveStatusLabel } from '../../lib/leave/leaveLabels';
import { colors, fonts, radii, sizes, spacing } from '../../theme';

type Props = {
  /** The request's status. When set, the status is shown instead of the button. */
  status?: LeaveRequestStatus | null;
  /** Opens "Begär ledigt". Left out: nothing is shown (e.g. a cancelled activity). */
  onRequest?: () => void;
  /** On the red or dark Nästa aktivitet card: white button. */
  onColor?: boolean;
};

const PILL: Record<LeaveRequestStatus, { bg: string; fg: string }> = {
  PENDING: { bg: colors.warningSoft, fg: colors.warning },
  APPROVED: { bg: colors.successSoft, fg: colors.success },
  DENIED: { bg: colors.dangerSoft, fg: colors.danger },
};

/**
 * "Begär ledigt" on a start-page card, or the status of the request
 * the player already has for the activity ("Väntar på svar", "Godkänd", "Nekad").
 */
export function LeaveAction({ status, onRequest, onColor = false }: Props) {
  if (status) {
    const { bg, fg } = PILL[status];
    return (
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color: fg }]}>{leaveStatusLabel(status)}</Text>
      </View>
    );
  }
  if (!onRequest) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onRequest}
      style={({ pressed }) => [
        styles.button,
        onColor ? styles.buttonOnColor : styles.buttonPlain,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, onColor ? styles.textOnColor : styles.textPlain]}>
        Begär ledigt
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 11,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  pillText: { fontFamily: fonts.semibold, fontSize: 13 },
  button: {
    alignSelf: 'flex-start',
    minHeight: sizes.touch,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: 18,
    borderRadius: radii.control,
    borderWidth: 1,
  },
  buttonPlain: { backgroundColor: colors.surface, borderColor: colors.border },
  buttonOnColor: { backgroundColor: colors.surface, borderColor: colors.surface },
  pressed: { opacity: 0.8 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15 },
  textPlain: { color: colors.primary },
  textOnColor: { color: colors.text },
});
