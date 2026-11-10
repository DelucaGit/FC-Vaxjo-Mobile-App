/** Sizes from the design spec, section 3 ("Mått och form"). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  /** Side margin on every screen. */
  page: 16,
  lg: 24,
} as const;

/** One radius everywhere: buttons, fields, cards, dialog. */
export const radius = 6;

export const sizes = {
  /** Minimum height of anything you can press. */
  touch: 48,
  header: 56,
  tabBar: 56,
  /** Segmented buttons may be a little lower than other buttons. */
  segment: 44,
  icon: 24,
  divider: 1,
} as const;
