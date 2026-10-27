import { API_BASE_URL } from './config';
import { readErrorMessage } from './http';

export type ClubUser = {
  id: number;
  name: string;
  email: string;
  roleName: string;
  playerNumber: number | null;
  mobilePhoneNumber: string | null;
  parentId: number | null;
  parentName: string | null;
  teamId: number | null;
  teamName: string | null;
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

export async function createUser(input: CreateUserInput): Promise<ClubUser> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function searchByName(name: string): Promise<ClubUser[]> {
  const response = await fetch(
    `${API_BASE_URL}/users/search?name=${encodeURIComponent(name)}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function searchByShirtNumber(number: number): Promise<ClubUser> {
  const response = await fetch(
    `${API_BASE_URL}/users/search?number=${encodeURIComponent(String(number))}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function searchByPhone(phone: string): Promise<ClubUser> {
  const response = await fetch(
    `${API_BASE_URL}/users/search?phone=${encodeURIComponent(phone)}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}
