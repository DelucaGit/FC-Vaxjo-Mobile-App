import { StyleSheet, Text, View } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { cancelledLabel } from '../activities/activityItems';
import { activityDateLabel } from '../../lib/dates';
import { colors, fonts, radii, spacing } from '../../theme';
import { placeLine, type HomeActivity } from './homeActivity';

type Props = {
  activity: HomeActivity;
  /** Shown after the venue, e.g. on the coach start page with several teams. */
  teamName?: string;
  /** A parent sees whose activity it is: "Nästa aktivitet för Elsa". */
  forName?: string;
};

/**
 * Nästa aktivitet: the large card at the top of the start page (prototype `.heroc`).
 * Red for a training, dark for a match. A cancelled one stays, with "Inställd" and the reason.
 */
export function NextActivityCard({ activity, teamName, forName }: Props) {
  const isMatch = activity.kind === 'match';
  const place = placeLine(activity, teamName);
  return (
    <View
      testID={`next-${activity.key}`}
      style={[styles.card, isMatch ? styles.match : styles.training]}
    >
      <Text style={styles.kick}>{forName ? `Nästa aktivitet för ${forName}` : 'Nästa aktivitet'}</Text>
      <Text style={[styles.big, activity.cancelled && styles.struck]}>{activity.title}</Text>
      <View style={styles.metaList}>
        <View style={styles.metaRow}>
          <Calendar size={20} color={colors.onPrimary} strokeWidth={2} />
          <Text style={styles.meta}>{activityDateLabel(activity.startsAt, activity.endsAt)}</Text>
        </View>
        {place ? (
          <View style={styles.metaRow}>
            <MapPin size={20} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.meta}>{place}</Text>
          </View>
        ) : null}
      </View>
      {activity.cancelled ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{cancelledLabel(activity.cancelReason ?? null)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.page,
    marginTop: spacing.sm,
    padding: 18,
    borderRadius: radii.card,
    gap: spacing.xs,
  },
  training: { backgroundColor: colors.primary },
  match: { backgroundColor: colors.text },
  kick: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 12 * 0.08,
    textTransform: 'uppercase',
    color: colors.onPrimary,
    opacity: 0.85,
  },
  big: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 28, color: colors.onPrimary },
  struck: { textDecorationLine: 'line-through' },
  metaList: { gap: 6, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { fontFamily: fonts.medium, fontSize: 15, color: colors.onPrimary, flexShrink: 1 },
  pill: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: 11,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.warningSoft,
  },
  pillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.warning },
});
