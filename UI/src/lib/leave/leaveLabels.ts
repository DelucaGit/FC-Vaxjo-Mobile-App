import type { LeaveReasonType, LeaveRequestStatus } from '../../api/leaveRequests';

/** The reasons in the order the form shows them, with their Swedish names. */
export const LEAVE_REASONS: readonly { value: LeaveReasonType; label: string }[] = [
  { value: 'SICK', label: 'Sjuk' },
  { value: 'SCHOOL', label: 'Skola/prov' },
  { value: 'FAMILY', label: 'Familj/resa' },
  { value: 'INJURY', label: 'Skada' },
  { value: 'OTHER', label: 'Annat' },
];

/** "Väntar på svar", "Godkänd" or "Nekad" (GLOSSARY). */
export function leaveStatusLabel(status: LeaveRequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Väntar på svar';
    case 'APPROVED':
      return 'Godkänd';
    case 'DENIED':
      return 'Nekad';
  }
}
