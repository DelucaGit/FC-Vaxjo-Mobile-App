import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';
import { requestJson, withJson } from './request';
import { ClubRoleName } from '../auth/roles';

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
  /** Only ADMIN, CHAIRMAN and a COACH of the team see these. Others get null. */
  memberSince?: string | null;
  memberUntil?: string | null;
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

export async function getUserById(id: number): Promise<ClubUser> {
  const response = await apiFetch(`${API_BASE_URL}/users/${id}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

/**
 * One search field. The server rejects a body that has more than one of these.
 * Shirt search uses playerNumber. The old query key was number.
 */
type UserSearchBody =
  | { name: string }
  | { playerNumber: number }
  | { phone: string };

/**
 * Search is POST with a JSON body, not a query string (F1, ADR 0004).
 * The phone number stays out of the URL, so an access log does not store it.
 * GET /api/users/search is 405.
 */
function postUserSearch(body: UserSearchBody): Promise<Response> {
  return apiFetch(`${API_BASE_URL}/users/search`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Name search returns a list. No match is an empty list, not an error. */
export async function searchByName(name: string): Promise<ClubUser[]> {
  const response = await postUserSearch({ name });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

/** Shirt search returns one user. A miss is 404 "User not found". */
export async function searchByShirtNumber(number: number): Promise<ClubUser> {
  const response = await postUserSearch({ playerNumber: number });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

/** Phone search returns one user. A miss is 404 "User not found". */
export async function searchByPhone(phone: string): Promise<ClubUser> {
  const response = await postUserSearch({ phone });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

/** Every user in the club. ADMIN and CHAIRMAN only. */
export function listUsers(): Promise<ClubUser[]> {
  return requestJson('/users');
}

/** Same call as getUserById, shorter name for new screens. */
export const getUser = getUserById;

/** Same call as softDeletePlayer: the player becomes inactive, history stays. */
export const deletePlayer = softDeletePlayer;

/** Exactly one field. The server answers 400 if more than one is sent. */
export type UserSearch = UserSearchBody;

/**
 * One function for all three searches. Name gives a list; shirt number and
 * phone give one user (a miss is 404). The result is always a list here,
 * so a screen does not need to care which kind of search it ran.
 */
export async function searchUsers(search: UserSearch): Promise<ClubUser[]> {
  if ('name' in search) {
    return searchByName(search.name);
  }
  if ('playerNumber' in search) {
    return [await searchByShirtNumber(search.playerNumber)];
  }
  return [await searchByPhone(search.phone)];
}

export type ChangeRoleResult = {
  id: number;
  roleName: ClubRoleName;
};

/**
 * ADMIN may set any role. CHAIRMAN may only turn a PLAYER into a COACH
 * ("Gör till tränare"). PLAYER -> COACH clears team, shirt number and parent.
 */
export function changeUserRole(id: number, roleName: ClubRoleName): Promise<ChangeRoleResult> {
  return requestJson(`/users/${id}/role`, withJson('PUT', { roleName }));
}

export type PasswordResetResult = {
  id: number;
  /** Shown once. The user must change it at the next login. */
  temporaryPassword: string;
};

/**
 * "Återställ lösenord" (#128). ADMIN on anyone but themselves; CHAIRMAN not on
 * ADMIN or CHAIRMAN. An inactive account is 404 "User not found".
 */
export function resetPassword(id: number): Promise<PasswordResetResult> {
  return requestJson(`/users/${id}/password-reset`, withJson('POST'));
}
