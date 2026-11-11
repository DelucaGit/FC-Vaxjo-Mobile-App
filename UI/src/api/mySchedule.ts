import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';
import { HomeAway, MatchResult } from './matches';
import type { TrainingType } from './trainingTypes';
import { queryString, requestJson, type ActivityWhen } from './request';

export type MyChild = {
  id: number;
  name: string;
  teamId: number | null;
  teamName: string | null;
};

export type MyTraining = {
  id: number;
  teamId: number;
  teamName: string;
  startsAt: string;
  endsAt: string;
  type: TrainingType;
  venue?: string | null;
  playerUserId: number;
  playerName: string;
  /** The player's own attendance mark. */
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
  /** SCHEDULED or CANCELLED. */
  trainingStatus?: 'SCHEDULED' | 'CANCELLED';
  cancelReason?: string | null;
  attendanceLockedAt?: string | null;
};

/** MyMatchResponse: the team's matches. No attendance row for the player. */
export type MyMatch = {
  id: number;
  teamId: number;
  teamName: string;
  opponent: string;
  kickoffAt: string;
  venue: string;
  homeAway: HomeAway;
  result: MatchResult | null;
  attendanceLockedAt: string | null;
};

export async function listMyChildren(): Promise<MyChild[]> {
  const response = await apiFetch(`${API_BASE_URL}/my/children`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

/** PLAYER leaves childId out. PARENT must pass the child's id. Without `when` you get everything. */
export function listMyTrainings(childId?: number, when?: ActivityWhen): Promise<MyTraining[]> {
  return requestJson(`/my/trainings${queryString({ childId, when })}`);
}

export type MyCoach = {
  id: number;
  name: string | null;
  email: string | null;
  mobilePhoneNumber: string | null;
};

// Coaches of the player's team. A parent must pass the child's id;
// a player must leave it out (the API answers 403 otherwise).
export async function listMyCoaches(childId?: number): Promise<MyCoach[]> {
  const query =
    childId != null ? `?childId=${encodeURIComponent(String(childId))}` : '';
  const response = await apiFetch(`${API_BASE_URL}/my/coaches${query}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

/** PLAYER leaves childId out. PARENT must pass the child's id. Without `when` you get everything. */
export function listMyMatches(childId?: number, when?: ActivityWhen): Promise<MyMatch[]> {
  return requestJson(`/my/matches${queryString({ childId, when })}`);
}
