import type { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Font family names. They must match the keys loaded with useFonts in App.tsx.
 * React Native does not pick a weight inside one family, so each weight is its own font.
 */
export const fonts = {
  display: 'Anton_400Regular',
  regular: 'WorkSans_400Regular',
  medium: 'WorkSans_500Medium',
  semibold: 'WorkSans_600SemiBold',
} as const;

/** Anton is always upper case with 0.02em letter spacing. */
function display(size: number): TextStyle {
  return {
    fontFamily: fonts.display,
    fontSize: size,
    letterSpacing: size * 0.02,
    textTransform: 'uppercase',
    color: colors.text,
  };
}

/** Text styles from the spec's typography table. */
export const type = {
  screenTitle: { ...display(22), lineHeight: 26 },
  dateRow: display(14),
  weekLabel: { ...display(15), color: colors.textMuted },
  heading: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  input: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  button: { fontFamily: fonts.semibold, fontSize: 15 },
  tab: { fontFamily: fonts.medium, fontSize: 12 },
} satisfies Record<string, TextStyle>;
