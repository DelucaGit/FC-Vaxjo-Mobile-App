import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';
import { ClubUser } from './users';

export type Team = {
  id: number;
  name: string;
};

export async function listTeams(): Promise<Team[]> {
  const response = await apiFetch(`${API_BASE_URL}/teams`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function createTeam(name: string): Promise<Team> {
  const response = await apiFetch(`${API_BASE_URL}/teams`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function listTeamCoaches(teamId: number): Promise<ClubUser[]> {
  const response = await apiFetch(`${API_BASE_URL}/teams/${teamId}/coaches`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function listTeamPlayers(teamId: number): Promise<ClubUser[]> {
  const response = await apiFetch(`${API_BASE_URL}/teams/${teamId}/players`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function addTeamCoach(teamId: number, userId: number): Promise<ClubUser> {
  const response = await apiFetch(`${API_BASE_URL}/teams/${teamId}/coaches`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function removeTeamCoach(teamId: number, userId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/teams/${teamId}/coaches/${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}
