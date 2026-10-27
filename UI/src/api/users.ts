import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';

export type ClubUser = {
  id: number;
  name: string;
  email: string;
  roleName: string;
  playerNumber: number | null;
  mobilePhoneNumber: string | null;
  parentId: number | null;
  parentName: string | null;
  parentEmail: string | null;
  parentMobilePhoneNumber: string | null;
  teamId: number | null;
  teamName: string | null;
  active: boolean;
  temporaryPassword?: string | null;
  parentTemporaryPassword?: string | null;
};

export type NewParentInput = {
  name: string;
  email: string;
  mobilePhoneNumber: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  roleName: string;
  playerNumber?: number | null;
  mobilePhoneNumber?: string | null;
  parentId?: number | null;
  newParent?: NewParentInput | null;
  teamId?: number | null;
};

export type UpdatePlayerInput = {
  name: string;
  email: string;
  mobilePhoneNumber?: string | null;
  playerNumber?: number | null;
  teamId: number;
  parentId?: number | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentMobilePhoneNumber?: string | null;
};

export async function createUser(input: CreateUserInput): Promise<ClubUser> {
  const response = await apiFetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function updatePlayer(id: number, input: UpdatePlayerInput): Promise<ClubUser> {
  const response = await apiFetch(`${API_BASE_URL}/users/${id}/player`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function softDeletePlayer(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function searchByName(name: string): Promise<ClubUser[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/users/search?name=${encodeURIComponent(name)}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function searchByShirtNumber(number: number): Promise<ClubUser> {
  const response = await apiFetch(
    `${API_BASE_URL}/users/search?number=${encodeURIComponent(String(number))}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function searchByPhone(phone: string): Promise<ClubUser> {
  const response = await apiFetch(
    `${API_BASE_URL}/users/search?phone=${encodeURIComponent(phone)}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}
