import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';

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
  title: string;
  playerUserId: number;
  playerName: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
};

export async function listMyChildren(): Promise<MyChild[]> {
  const response = await apiFetch(`${API_BASE_URL}/my/children`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function listMyTrainings(childId?: number): Promise<MyTraining[]> {
  const query =
    childId != null ? `?childId=${encodeURIComponent(String(childId))}` : '';
  const response = await apiFetch(`${API_BASE_URL}/my/trainings${query}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
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
