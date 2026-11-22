import { StyleSheet, Text, View } from 'react-native';
import { cancelledLabel } from '../activities/activityItems';
import { timeLabel, toDate } from '../../lib/dates';
import { colors, fonts, radii, spacing, type } from '../../theme';
import { placeLine, type HomeActivity } from './homeActivity';

const DAYS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

type Props = {
  activity: HomeActivity;
  /** Shown after the venue, e.g. on the coach start page with several teams. */
  teamName?: string;
};

/**
 * One activity in Kommande vecka (prototype `.arow`): a day block on the left,
 * then the title, the time and the venue. A match has a red day block.
 */
export function ActivityCard({ activity, teamName }: Props) {
  const start = toDate(activity.startsAt);
  const isMatch = activity.kind === 'match';
  const time = activity.endsAt
    ? `${timeLabel(activity.startsAt)}–${timeLabel(activity.endsAt)}`
    : timeLabel(activity.startsAt);
  const place = placeLine(activity, teamName);
  return (
    <View testID={`activity-${activity.key}`} style={styles.card}>
      <View style={[styles.day, isMatch && styles.dayMatch]}>
        <Text style={[styles.dayName, isMatch && styles.onMatch]}>{DAYS[start.getDay()]}</Text>
        <Text style={[styles.dayNumber, isMatch && styles.onMatch]}>{start.getDate()}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[type.rowTitle, activity.cancelled && styles.struck]}>{activity.title}</Text>
        <Text style={type.meta}>{place ? `${time} · ${place}` : time}</Text>
        {activity.cancelled ? (
          <Text style={[type.meta, styles.warning]}>
            {cancelledLabel(activity.cancelReason ?? null)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    marginHorizontal: spacing.page,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
  },
  day: {
    width: 48,
    height: 48,
    borderRadius: radii.control,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayMatch: { backgroundColor: colors.primary },
  dayName: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  dayNumber: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  onMatch: { color: colors.onPrimary },
  body: { flex: 1, gap: 4 },
  struck: { color: colors.textMuted, textDecorationLine: 'line-through' },
  warning: { color: colors.warning },
});
