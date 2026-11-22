import type { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Font family names. They must match the keys loaded with useFonts in App.tsx.
 * React Native does not pick a weight inside one family, so each weight is its own font.
 * The prototype uses only Inter: 500 for text, 600 for buttons and labels, 700 for headings.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Small upper-case label, e.g. "VECKA 46" (prototype `.day` / `.gt`). */
const overline: TextStyle = {
  fontFamily: fonts.semibold,
  fontSize: 12,
  letterSpacing: 12 * 0.08,
  textTransform: 'uppercase',
  color: colors.textMuted,
};

/** Text styles, taken from the prototype's CSS. */
export const type = {
  /** Header title (`.bar h2`). */
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text,
  },
  /** Date line in a row, e.g. "Tis 12 nov · 17:30–19:00". */
  dateRow: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  weekLabel: overline,
  /** Section heading (`.sect`). */
  heading: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  /** Bold title in a row (`.rt b`). */
  rowTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  /** Typed text in a field (`.inp`). */
  input: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  /** Secondary line (`.card .meta`, `.hint`). */
  meta: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  /** Label above a field or a list (`.lbl`). */
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  /** Text in a button (`.btn`). */
  button: { fontFamily: fonts.semibold, fontSize: 16 },
  tab: { fontFamily: fonts.semibold, fontSize: 12 },
} satisfies Record<string, TextStyle>;
