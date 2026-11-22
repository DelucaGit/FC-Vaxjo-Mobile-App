import type { LeaveReasonType } from '../../api/leaveRequests';

/** The shortest text Annat accepts, after trim. The API has the same rule. */
export const MIN_OTHER_TEXT = 5;

type Input = { reasonType: LeaveReasonType | null; reasonText: string };

/**
 * Checks a leave request before it is sent. Returns null when it can be sent,
 * otherwise the Swedish message to show. Only Annat (OTHER) needs a text.
 */
export function validateLeaveRequest({ reasonType, reasonText }: Input): string | null {
  if (reasonType == null) {
    return 'Välj en orsak.';
  }
  if (reasonType === 'OTHER' && reasonText.trim().length < MIN_OTHER_TEXT) {
    return `Skriv en orsak med minst ${MIN_OTHER_TEXT} tecken.`;
  }
  return null;
}
