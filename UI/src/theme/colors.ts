/**
 * Design tokens from Google Stitch (API/src/main/resources/stich.md).
 * FC Växjö club palette — burgundy primary, warm off-white surfaces.
 */
export const colors = {
  primary: '#8B1E22',
  primaryPressed: '#6b020e',
  onPrimary: '#ffffff',
  primaryContainer: '#8b1e22',
  inversePrimary: '#ffb3af',

  secondary: '#835500',
  secondaryContainer: '#feae2c',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#6b4500',

  tertiary: '#323232',
  tertiaryContainer: '#494848',
  onTertiary: '#ffffff',

  background: '#faf9f7',
  surface: '#faf9f7',
  surfaceBright: '#faf9f7',
  surfaceDim: '#dadad8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f4f3f1',
  surfaceContainer: '#efeeec',
  surfaceContainerHigh: '#e9e8e6',
  surfaceContainerHighest: '#e3e2e0',
  surfaceVariant: '#e3e2e0',

  onSurface: '#1a1c1b',
  onSurfaceVariant: '#584140',
  onBackground: '#1a1c1b',

  outline: '#8b716f',
  outlineVariant: '#dfbfbd',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  inverseSurface: '#2f3130',
  inverseOnSurface: '#f1f1ef',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
  margin: 16,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 12,
  full: 9999,
} as const;
