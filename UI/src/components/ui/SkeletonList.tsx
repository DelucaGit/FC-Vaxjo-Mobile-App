import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radius, sizes, spacing } from '../../theme';
import { List } from './List';

type Props = {
  /** How many grey rows to draw. */
  rows?: number;
};

/** Title and meta widths, so the rows do not all look the same. Picked by row index. */
const WIDTHS: { title: DimensionValue; meta: DimensionValue }[] = [
  { title: '62%', meta: '38%' },
  { title: '48%', meta: '30%' },
  { title: '70%', meta: '42%' },
  { title: '55%', meta: '34%' },
];

/**
 * Grey placeholder rows while a screen loads its data for the first time ("skeleton").
 * Same white box, dividers and row height as a real `List` of `Row`s, so nothing jumps
 * when the data arrives. Screen readers hear "Laddar" once, not each grey bar.
 *
 * Show it only while the data is still `null`. A pull-to-refresh keeps the real list.
 */
export function SkeletonList({ rows = 4 }: Props) {
  const opacity = usePulse();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Laddar"
      testID="skeleton-list"
    >
      <Animated.View
        style={{ opacity }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <List>
          {Array.from({ length: rows }, (_, index) => {
            const width = WIDTHS[index % WIDTHS.length];
            return (
              <View key={index} style={styles.row} testID="skeleton-row">
                <View style={styles.titleLine}>
                  <View style={[styles.bar, { width: width.title }]} />
                </View>
                <View style={styles.metaLine}>
                  <View style={[styles.bar, { width: width.meta }]} />
                </View>
              </View>
            );
          })}
        </List>
      </Animated.View>
    </View>
  );
}

/**
 * A slow, calm fade between full and 55 % opacity, so the user can see that
 * something is happening. Runs on the native side (useNativeDriver) and stops
 * when the placeholder goes away.
 */
function usePulse() {
  // useState (not useRef) keeps the same value between renders without reading a ref while rendering.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const step = (toValue: number) =>
      Animated.timing(opacity, {
        toValue,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const pulse = Animated.loop(Animated.sequence([step(0.55), step(1)]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return opacity;
}

const styles = StyleSheet.create({
  // Same box as Row: at least 48 high, page padding on the sides, 12 above and below.
  row: {
    minHeight: sizes.touch,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  // Each line is as tall as the text it stands for, with a thinner bar in the middle.
  titleLine: { height: 20, justifyContent: 'center' },
  metaLine: { height: 18, justifyContent: 'center' },
  bar: { height: 12, borderRadius: radius, backgroundColor: colors.border },
});
