import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';
import { queryString, requestJson, withJson, type ActivityWhen } from './request';
import type { TrainingType } from './trainingTypes';

/** SCHEDULED is the normal state. CANCELLED keeps the row and a reason. */
export type TrainingStatus = 'SCHEDULED' | 'CANCELLED';

export type Training = {
  id: number;
  teamId: number;
  teamName: string;
  startsAt: string;
  endsAt: string;
  type: TrainingType;
  venue: string | null;
  status: TrainingStatus;
  cancelReason: string | null;
  createdByUserId: number;
  /** Set when attendance is frozen. null while it is still open. */
  attendanceLockedAt: string | null;
};

export type AttendanceRow = {
  playerUserId: number;
  playerName: string;
  playerNumber: number | null;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
};

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export type CreateTrainingInput = {
  teamId: number;
  startsAt: string;
  endsAt: string;
  type: TrainingType;
  venue?: string | null;
};

/** PUT /trainings/{id} replaces these four fields. */
export type UpdateTrainingInput = {
  startsAt: string;
  endsAt: string;
  type: TrainingType;
  venue?: string | null;
};

/** Without `when` you get every training of the team, newest first. */
export function listTrainings(teamId: number, when?: ActivityWhen): Promise<Training[]> {
  return requestJson(`/trainings${queryString({ teamId, when })}`);
}

export async function createTraining(input: CreateTrainingInput): Promise<Training> {
  const response = await apiFetch(`${API_BASE_URL}/trainings`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function getTraining(id: number): Promise<Training> {
  const response = await apiFetch(`${API_BASE_URL}/trainings/${id}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function listAttendance(trainingId: number): Promise<AttendanceRow[]> {
  const response = await apiFetch(`${API_BASE_URL}/trainings/${trainingId}/attendance`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function updateAttendance(
  trainingId: number,
  playerId: number,
  status: AttendanceStatus,
): Promise<AttendanceRow> {
  const response = await apiFetch(
    `${API_BASE_URL}/trainings/${trainingId}/attendance/${playerId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

/** Same call as listAttendance, named to match listMatchAttendance. */
export const listTrainingAttendance = listAttendance;

/** Same call as updateAttendance, named to match markMatchAttendance. */
export const markTrainingAttendance = updateAttendance;

export function updateTraining(id: number, input: UpdateTrainingInput): Promise<Training> {
  return requestJson(`/trainings/${id}`, withJson('PUT', input));
}

/**
 * cancelled: true cancels (reason is shown to players and parents).
 * cancelled: false makes the training active again.
 */
export function setTrainingCancelled(
  id: number,
  cancelled: boolean,
  reason?: string | null,
): Promise<Training> {
  return requestJson(
    `/trainings/${id}/cancellation`,
    withJson('PUT', { cancelled, reason: reason ?? null }),
  );
}

/** Freezes the list. After this, marking answers 400. */
export function lockTrainingAttendance(id: number): Promise<Training> {
  return requestJson(`/trainings/${id}/attendance/lock`, withJson('PUT'));
}
