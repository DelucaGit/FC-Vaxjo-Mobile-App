import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';

export type Training = {
  id: number;
  teamId: number;
  teamName: string;
  startsAt: string;
  endsAt: string;
  title: string;
  createdByUserId: number;
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
  title?: string | null;
};

export async function listTrainings(teamId: number): Promise<Training[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/trainings?teamId=${encodeURIComponent(String(teamId))}`,
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
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
