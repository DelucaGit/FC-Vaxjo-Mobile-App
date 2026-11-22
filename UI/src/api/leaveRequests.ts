import { queryString, requestJson, requestVoid, withJson } from './request';

/** Orsak (GLOSSARY): Sjuk, Skola/prov, Familj/resa, Skada, Annat. */
export type LeaveReasonType = 'SICK' | 'SCHOOL' | 'FAMILY' | 'INJURY' | 'OTHER';

/** Väntar på svar, Godkänd, Nekad. */
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED';

/** LeaveRequestResponse. The reason is personal data and can be sensitive. */
export type LeaveRequest = {
  id: number;
  playerUserId: number;
  playerName?: string | null;
  activityKind: 'TRAINING' | 'MATCH';
  activityId: number;
  activityStart?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  reasonType: LeaveReasonType;
  reasonText?: string | null;
  status: LeaveRequestStatus;
  coachNote?: string | null;
  createdAt: string;
};

/**
 * CreateLeaveRequestRequest: exactly one of trainingId and matchId.
 * A PLAYER leaves playerUserId out; a PARENT must send the child's id.
 * reasonText is required (at least 5 characters after trim) for OTHER.
 */
export type CreateLeaveRequest = {
  trainingId?: number;
  matchId?: number;
  playerUserId?: number;
  reasonType: LeaveReasonType;
  reasonText?: string | null;
};

/** POST /my/leave-requests. Answers 201 with the new request (PENDING). */
export function createLeaveRequest(body: CreateLeaveRequest): Promise<LeaveRequest> {
  return requestJson('/my/leave-requests', withJson('POST', body));
}

/**
 * GET /my/leave-requests, newest first. A PLAYER leaves childId out (403 otherwise);
 * a PARENT passes it to get one child's requests, or leaves it out to get all children's.
 */
export function listMyLeaveRequests(childId?: number): Promise<LeaveRequest[]> {
  return requestJson(`/my/leave-requests${queryString({ childId })}`);
}

/** DELETE /my/leave-requests/{id}. Only a request that is still PENDING (400 otherwise). */
export function withdrawLeaveRequest(id: number): Promise<void> {
  return requestVoid(`/my/leave-requests/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
}

/** Filter for the staff list. Both are optional; a COACH who asks for another team gets 403. */
export type LeaveRequestFilter = {
  status?: LeaveRequestStatus;
  teamId?: number;
};

/**
 * GET /leave-requests, newest first: the requests for the teams the user is responsible for
 * (COACH: own teams, CHAIRMAN and ADMIN: every team).
 */
export function listLeaveRequests(filter: LeaveRequestFilter = {}): Promise<LeaveRequest[]> {
  return requestJson(`/leave-requests${queryString(filter)}`);
}

/**
 * POST /leave-requests/{id}/approve. The server also sets the player's attendance to EXCUSED.
 * 400 when the request is already answered or the attendance list is locked.
 */
export function approveLeaveRequest(id: number): Promise<LeaveRequest> {
  return requestJson(`/leave-requests/${encodeURIComponent(String(id))}/approve`, withJson('POST'));
}

/** POST /leave-requests/{id}/deny with an optional comment (empty becomes null on the server). */
export function denyLeaveRequest(id: number, note?: string | null): Promise<LeaveRequest> {
  return requestJson(
    `/leave-requests/${encodeURIComponent(String(id))}/deny`,
    withJson('POST', { note: note ?? null }),
  );
}
