import { API_BASE_URL } from './config';
import { readErrorMessage } from './http';
import { ClubUser } from './users';

export type Team = {
  id: number;
  name: string;
};

export async function listTeams(): Promise<Team[]> {
  const response = await fetch(`${API_BASE_URL}/teams`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function createTeam(name: string): Promise<Team> {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function listTeamCoaches(teamId: number): Promise<ClubUser[]> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/coaches`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function addTeamCoach(teamId: number, userId: number): Promise<ClubUser> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/coaches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

export async function removeTeamCoach(teamId: number, userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/coaches/${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}
