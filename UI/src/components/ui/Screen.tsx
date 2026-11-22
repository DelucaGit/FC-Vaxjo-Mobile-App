import type { ReactNode } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Menu } from 'lucide-react-native';
import { useMenu, useProfileMenu } from '../../navigation/menuContext';
import { colors, radii, sizes, spacing, type } from '../../theme';
import type { RefreshState } from './useRefresh';

const logo = require('../../../assets/fc-logo.png');

type Props = {
  title: string;
  /** Shows a back arrow in the header. Usually `navigation.goBack`. */
  onBack?: () => void;
  /** Something small on the right of the header, e.g. a link button. */
  right?: ReactNode;
  /** Fixed bar under the content, e.g. one or two buttons. */
  bottom?: ReactNode;
  /** Floats on top of the content and does not scroll with it, e.g. a `FabMenu`. */
  overlay?: ReactNode;
  /** Set to false when the content scrolls by itself (a FlatList). */
  scroll?: boolean;
  /** Pull-to-refresh on the scrolling content. Pass the result of `useRefresh`. */
  refresh?: RefreshState;
  children?: ReactNode;
};

/**
 * Frame for every screen (spec section 4): header, scrolling content, fixed bottom bar.
 *
 * The first page of the stack (a menu page) gets the menu button instead of a back
 * arrow, also when the screen passes `onBack`: a page like "Ny användare" is a menu
 * page when opened from the menu, and a pushed page when opened from "Användare".
 */
export function Screen({
  title,
  onBack,
  right,
  bottom,
  overlay,
  scroll = true,
  refresh,
  children,
}: Props) {
  // Set only on the first page of the stack, so a pushed page keeps its back arrow.
  const menu = useMenu();
  const showMenu = menu !== null;
  // Set on every page of the signed-in stack: the initials that open the profile menu.
  const profile = useProfileMenu();

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        {/* Left: the menu button on a menu page, the back arrow on a pushed page. */}
        {showMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Öppna meny"
            onPress={menu?.openMenu}
            hitSlop={8}
            style={[styles.round, styles.menuButton]}
          >
            <Menu size={sizes.icon - 2} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : null}
        {onBack && !showMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
            onPress={onBack}
            hitSlop={8}
            style={styles.round}
          >
            <ChevronLeft size={sizes.icon - 2} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.brand}>
            <Image
              source={logo}
              accessible
              accessibilityRole="image"
              accessibilityLabel="FC Växjö"
              accessibilityIgnoresInvertColors
              style={styles.logo}
            />
            {/* Hidden from screen readers: the logo already says "FC Växjö". */}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              numberOfLines={1}
              style={styles.brandName}
            >
              FC Växjö
            </Text>
          </View>
        )}
        {/* Right: the title takes the space that is left, and it is the part that shrinks ("…"). */}
        <Text accessibilityRole="header" numberOfLines={1} style={[type.screenTitle, styles.title]}>
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
        {profile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Öppna profilmeny"
            onPress={profile.openProfileMenu}
            hitSlop={8}
            style={[styles.round, styles.initials]}
          >
            <Text style={styles.initialsText}>{profile.initials}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* A wrapper, so the overlay covers the content area but not the header or bottom bar. */}
      <View style={styles.body}>
        {scroll ? (
          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={refresh ? pullToRefresh(refresh) : undefined}
            testID="screen-scroll"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
        {overlay}
      </View>

      {bottom ? <View style={styles.bottom}>{bottom}</View> : null}
    </SafeAreaView>
  );
}

/**
 * The spinner at the top when the list is pulled down, in the club colour.
 * Exported for a screen that scrolls by itself: `<FlatList refreshControl={pullToRefresh(refresh)} />`.
 * `colors` is for Android and `tintColor` for iOS.
 *
 * A plain function, not a component: on Android the ScrollView copies this element and
 * puts itself inside it, which only works when the element is a RefreshControl itself.
 */
export function pullToRefresh({ refreshing, onRefresh }: RefreshState) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  );
}

// Prototype `.bar` and `.body`: the header and the content share the light grey page
// background, and the white cards stand out on it.
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    height: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    backgroundColor: colors.background,
  },
  // Prototype `.round`: a white circle with a thin border.
  round: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flexShrink 0: the logo and name never get squeezed; the title gives way instead.
  menuButton: { marginRight: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  logo: { width: 32, height: 32 },
  brandName: { ...type.heading, marginLeft: spacing.sm },
  // flex 1 + minWidth 0: the title fills the free space and can shrink below its text width.
  title: { flex: 1, minWidth: 0, marginLeft: spacing.md, textAlign: 'right' },
  right: { marginLeft: spacing.sm },
  // Prototype `.avatar`: a dark circle with white initials, at the far right.
  initials: { marginLeft: spacing.md, backgroundColor: colors.text, borderColor: colors.text },
  initialsText: { ...type.rowTitle, fontSize: 14, color: colors.onPrimary },
  body: { flex: 1 },
  content: { flex: 1, backgroundColor: colors.background },
  // Prototype `.foot`: buttons on the page background, no line above.
  bottom: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.page,
    backgroundColor: colors.background,
  },
});
