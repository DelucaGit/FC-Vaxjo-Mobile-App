import type { ViewStyle } from 'react-native';
import { colors } from './colors';

/** Spacing. The prototype uses a 16 px side margin on every screen. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  /** Side margin on every screen. */
  page: 16,
  lg: 24,
} as const;

/** Radius of buttons, fields, toasts and small boxes (prototype `.btn`, `.inp`). */
export const radius = 12;

/** All radii from the prototype. `radius` above is the same as `radii.control`. */
export const radii = {
  control: radius,
  /** Cards and grouped lists. Prototype `--r`. */
  card: 16,
  /** Dialogs and bottom sheets. */
  sheet: 24,
  /** Chips, badges, round buttons. */
  pill: 999,
} as const;

/** Shadows. The prototype only uses them on things that float: sheets, menus, the plus button. */
export const shadows = {
  raised: {
    elevation: 8,
    shadowColor: colors.text,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
} satisfies Record<string, ViewStyle>;

export const sizes = {
  /** Minimum height of anything you can press. */
  touch: 48,
  header: 56,
  tabBar: 56,
  /** Segmented buttons may be a little lower than other buttons. */
  segment: 44,
  /** Text fields (prototype `.inp` is 56; 52 in a row with a button). */
  input: 52,
  icon: 24,
  divider: 1,
} as const;
