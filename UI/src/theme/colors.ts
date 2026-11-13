/**
 * Colors from the design spec, section 3 (docs/design/fc-vaxjo-design-spec.md).
 * Light mode only. The spec forbids a dark mode.
 */
export const colors = {
  /** Buttons, links, active tab. */
  primary: '#8F1822',
  /** Primary while pressed. */
  primaryPressed: '#680010',
  /** Text on a primary background. */
  onPrimary: '#FAFAF9',
  /** Warning: not marked, cancelled, errors shown to the user. */
  warning: '#D97706',
  /** Soft warning background (oklch 0.962 0.058 95.6). */
  warningSoft: '#FEF3C7',
  /** Page background inside the app. */
  background: '#FAFAF9',
  /** Field background, segmented background, pressed rows. */
  muted: '#F5F5F4',
  /** Lists, cards, header, bottom menu. */
  surface: '#FFFFFF',
  /** Body text. */
  text: '#1C1917',
  /** Secondary text, inactive tabs. */
  textMuted: '#78716C',
  /** Dividers and input borders. */
  border: '#E7E5E4',
  /** Dark layer behind a dialog: #1C1917 at 45 %. */
  overlay: 'rgba(28, 25, 23, 0.45)',
} as const;
