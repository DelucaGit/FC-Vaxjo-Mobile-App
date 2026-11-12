import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, sizes, spacing, type } from '../../theme';

const logo = require('../../../assets/fc-logo.png');

type Props = {
  title: string;
  /** Shows a back arrow in the header. Usually `navigation.goBack`. */
  onBack?: () => void;
  /** Something small on the right of the header, e.g. a link button. */
  right?: ReactNode;
  /** Fixed bar under the content, e.g. one or two buttons. */
  bottom?: ReactNode;
  /** Set to false when the content scrolls by itself (a FlatList). */
  scroll?: boolean;
  children?: ReactNode;
};

/**
 * Frame for every screen (spec section 4): header, scrolling content, fixed bottom bar.
 * The bottom menu is drawn by the tab navigator, not here.
 */
export function Screen({ title, onBack, right, bottom, scroll = true, children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        {/* Left: the back arrow, or else the club's logo and name. */}
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
            onPress={onBack}
            hitSlop={8}
            style={styles.back}
          >
            <ChevronLeft size={sizes.icon} color={colors.text} strokeWidth={2} />
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
      </View>

      {scroll ? (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}

      {bottom ? <View style={styles.bottom}>{bottom}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    height: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    backgroundColor: colors.surface,
    borderBottomWidth: sizes.divider,
    borderBottomColor: colors.border,
  },
  back: { marginLeft: -spacing.xs },
  // flexShrink 0: the logo and name never get squeezed; the title gives way instead.
  brand: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  logo: { width: 32, height: 32 },
  brandName: { ...type.heading, marginLeft: spacing.sm },
  // flex 1 + minWidth 0: the title fills the free space and can shrink below its text width.
  title: { flex: 1, minWidth: 0, marginLeft: spacing.md, textAlign: 'right' },
  right: { marginLeft: spacing.sm },
  content: { flex: 1, backgroundColor: colors.background },
  bottom: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.page,
    backgroundColor: colors.surface,
    borderTopWidth: sizes.divider,
    borderTopColor: colors.border,
  },
});
