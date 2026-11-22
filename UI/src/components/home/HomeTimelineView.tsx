import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, spacing, type } from '../../theme';
import { Empty } from '../ui';
import { ActivityCard } from './ActivityCard';
import type { HomeActivity } from './homeActivity';
import { NextActivityCard } from './NextActivityCard';

type Props = {
  next: HomeActivity | null;
  comingWeek: HomeActivity[];
  hasMore: boolean;
  /** How many times "Visa fler" has been pressed. The heading changes after the first. */
  extraWeeks: number;
  onShowMore: () => void;
  /** Passed on to the cards. */
  teamName?: string;
  forName?: string;
  /** When given, every card is a button that calls this with its activity. */
  onPressActivity?: (activity: HomeActivity) => void;
};

/**
 * The start page body: Nästa aktivitet, then Kommande vecka and "Visa fler".
 * Takes the result of `homeTimeline`, so player, parent and coach pages look the same.
 */
export function HomeTimelineView({
  next,
  comingWeek,
  hasMore,
  extraWeeks,
  onShowMore,
  teamName,
  forName,
  onPressActivity,
}: Props) {
  if (!next) {
    return <Empty text="Inga kommande aktiviteter" />;
  }
  return (
    <>
      <NextActivityCard
        activity={next}
        teamName={teamName}
        forName={forName}
        onPress={onPressActivity ? () => onPressActivity(next) : undefined}
      />
      <Text style={styles.heading}>
        {extraWeeks === 0 ? 'Kommande vecka' : 'Kommande aktiviteter'}
      </Text>
      {comingWeek.length === 0 ? <Text style={styles.hint}>Inget mer inplanerat just nu.</Text> : null}
      {comingWeek.map((activity) => (
        <ActivityCard
          key={activity.key}
          activity={activity}
          teamName={teamName}
          onPress={onPressActivity ? () => onPressActivity(activity) : undefined}
        />
      ))}
      {hasMore ? (
        <Pressable accessibilityRole="button" onPress={onShowMore} style={styles.more}>
          <Text style={styles.moreText}>Visa fler</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...type.heading,
    marginTop: 20,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.page + spacing.xs,
  },
  hint: { ...type.meta, marginHorizontal: spacing.page + 2, marginBottom: spacing.md },
  more: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 22,
    marginTop: spacing.sm,
  },
  moreText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
