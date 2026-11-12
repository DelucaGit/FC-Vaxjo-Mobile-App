import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors, sizes, spacing } from '../../theme';
import { Button } from './Button';

export type FabAction = {
  label: string;
  onPress: () => void;
};

type Props = {
  /** The choices that slide up when the plus button is tapped, top to bottom. */
  actions: FabAction[];
};

/** Size of the round button. 56 is the usual size for a floating button and is above `sizes.touch`. */
const FAB_SIZE = 56;

/** Room to leave under a list so its last row is not hidden behind the button. */
export const FAB_SPACE = FAB_SIZE + spacing.page * 2;

/** How long the open and close animation runs, in milliseconds. */
const DURATION = 180;

/**
 * A round red plus button in the bottom-right corner (issue #125).
 * A tap opens a small menu: the choices slide up, the screen behind gets darker and the plus turns
 * into an ×. A tap on ×, on the dark area or on a choice closes it again.
 *
 * Put it in `Screen`'s `overlay`, so it floats over the content and does not scroll with it.
 */
export function FabMenu({ actions }: Props) {
  const [open, setOpen] = useState(false);
  // 0 = closed, 1 = open. One value drives both the slide and the turn of the plus.
  // useState (not useRef) keeps the same value between renders and is allowed to be read while rendering.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: DURATION,
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const choose = (action: FabAction) => {
    setOpen(false);
    action.onPress();
  };

  // The plus turned 45 degrees looks like an ×.
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [spacing.lg, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {open ? (
        // The dark layer. Screen readers skip it; they close the menu with the × instead.
        <Pressable
          testID="fab-backdrop"
          accessible={false}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={() => setOpen(false)}
        />
      ) : null}

      <View style={styles.corner} pointerEvents="box-none">
        {open ? (
          <Animated.View
            style={[styles.actions, { opacity: progress, transform: [{ translateY: slide }] }]}
          >
            {actions.map((action) => (
              <Button key={action.label} title={action.label} onPress={() => choose(action)} />
            ))}
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Stäng' : 'Lägg till aktivitet'}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Plus size={sizes.icon + 4} color={colors.onPrimary} strokeWidth={2.5} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay },
  corner: {
    position: 'absolute',
    right: spacing.page,
    bottom: spacing.page,
    alignItems: 'flex-end',
  },
  actions: { alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // A soft shadow so the button reads as lying on top of the list.
    elevation: 4,
    shadowColor: colors.text,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabPressed: { backgroundColor: colors.primaryPressed },
});
