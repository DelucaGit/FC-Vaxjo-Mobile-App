import { queryString, requestJson, withJson, type ActivityWhen } from './request';
import { AttendanceRow, AttendanceStatus } from './trainings';

/** The API sends HOME or AWAY. The app shows "Hemma" / "Borta". */
export type HomeAway = 'HOME' | 'AWAY';

/** SCHEDULED (the match is on) or CANCELLED ("Inställd"). */
export type MatchStatus = 'SCHEDULED' | 'CANCELLED';

/** Our goals first, the opponent's second. null on a match not played yet. */
export type MatchResult = {
  goalsFor: number;
  goalsAgainst: number;
};

/** MatchResponse in the API. Times are local "yyyy-MM-ddTHH:mm:ss" strings. */
export type Match = {
  id: number;
  teamId: number;
  teamName: string;
  opponent: string;
  kickoffAt: string;
  venue: string;
  homeAway: HomeAway;
  result: MatchResult | null;
  /** Not marked required in the API contract, so a missing value counts as SCHEDULED. */
  status?: MatchStatus;
  /** Optional reason, only on a cancelled match. */
  cancelReason?: string | null;
  createdByUserId: number;
  /** Set when attendance is frozen. null while it is still open. */
  attendanceLockedAt: string | null;
};

export type CreateMatchInput = {
  teamId: number;
  opponent: string;
  kickoffAt: string;
  venue: string;
  homeAway: HomeAway;
  /** Optional: only for a match that is already played. */
  goalsFor?: number | null;
  goalsAgainst?: number | null;
};

/** ADMIN, CHAIRMAN, or a COACH of the team. Without `when` you get every match, newest first. */
export function listMatches(teamId: number, when?: ActivityWhen): Promise<Match[]> {
  return requestJson(`/matches${queryString({ teamId, when })}`);
}

export function getMatch(id: number): Promise<Match> {
  return requestJson(`/matches/${id}`);
}

export function createMatch(input: CreateMatchInput): Promise<Match> {
  return requestJson('/matches', withJson('POST', input));
}

/** Both null clears the result. */
export function setMatchResult(
  id: number,
  goalsFor: number | null,
  goalsAgainst: number | null,
): Promise<Match> {
  return requestJson(`/matches/${id}/result`, withJson('PUT', { goalsFor, goalsAgainst }));
}

export function listMatchAttendance(matchId: number): Promise<AttendanceRow[]> {
  return requestJson(`/matches/${matchId}/attendance`);
}

export function markMatchAttendance(
  matchId: number,
  playerId: number,
  status: AttendanceStatus,
): Promise<AttendanceRow> {
  return requestJson(`/matches/${matchId}/attendance/${playerId}`, withJson('PUT', { status }));
}

/** Freezes the list. After this, marking answers 400. */
export function lockMatchAttendance(matchId: number): Promise<Match> {
  return requestJson(`/matches/${matchId}/attendance/lock`, withJson('PUT'));
}

/** The fields "Ändra match" can change. The team, result and attendance stay as they are. */
export type UpdateMatchInput = {
  opponent: string;
  kickoffAt: string;
  venue: string;
  homeAway: HomeAway;
};

/** ADMIN, CHAIRMAN, or a COACH of the team. A new kick-off may not have passed (except ADMIN). */
export function updateMatch(id: number, input: UpdateMatchInput): Promise<Match> {
  return requestJson(`/matches/${id}`, withJson('PUT', input));
}

/**
 * cancelled: true cancels (reason is shown to players and parents).
 * cancelled: false makes the match active again.
 * While cancelled, attendance and result answer 400. The match can still be edited.
 */
export function setMatchCancelled(
  id: number,
  cancelled: boolean,
  reason?: string | null,
): Promise<Match> {
  return requestJson(
    `/matches/${id}/cancellation`,
    withJson('PUT', { cancelled, reason: reason ?? null }),
  );
}
