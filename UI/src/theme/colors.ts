/**
 * Colors from the approved prototype (`Design files/fc-vaxjo-prototyp.html`, the `:root` CSS
 * variables). The prototype wins over the older design spec where they differ.
 * Light mode only. The spec forbids a dark mode.
 */
export const colors = {
  /** Buttons, links, active tab, chosen chip. Prototype `--red`. */
  primary: '#8F1822',
  /** Primary while pressed. Prototype `--redh`. */
  primaryPressed: '#7A1019',
  /** Soft red background, e.g. the active item in a menu. */
  primarySoft: '#F9ECED',
  /** Text on a primary (or dark) background. */
  onPrimary: '#FFFFFF',
  /** Warning: not marked, cancelled, errors shown to the user. Prototype `--amb`. */
  warning: '#B45309',
  /** Soft warning background. Prototype `--ambl`. */
  warningSoft: '#FEF3C7',
  /** Good news, e.g. approved or saved. Prototype `--grn`. */
  success: '#15803D',
  /** Soft success background. Prototype `--grnl`. */
  successSoft: '#DCFCE7',
  /** Destructive text, e.g. delete or denied. Prototype `--redd`. */
  danger: '#B91C1C',
  /** Soft destructive background. Prototype `--redl`. */
  dangerSoft: '#FEE2E2',
  /** Page background inside the app (light grey under the white cards). Prototype `--bg`. */
  background: '#F3F5F7',
  /** Pressed rows, segmented background, round icon backgrounds. */
  muted: '#F3F5F7',
  /** Lists, cards, fields, dialogs. Prototype `--card`. */
  surface: '#FFFFFF',
  /** Body text and dark surfaces (toast). Prototype `--ink`. */
  text: '#111827',
  /** Secondary text, captions. Prototype `--mute`. */
  textMuted: '#6B7280',
  /** Icons in round icon circles. */
  icon: '#4B5563',
  /** Chevrons at the end of a row. */
  chevron: '#9CA3AF',
  /** Dividers and borders. Prototype `--line`. */
  border: '#E5E7EB',
  /** Dark layer behind a dialog: ink at 45 %. */
  overlay: 'rgba(17, 24, 39, 0.45)',
} as const;
