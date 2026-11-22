import { requestJson, requestVoid, withJson } from './request';

/** A place in the club's shared list (issue #217). Not per team. */
export type SavedVenue = {
  id: number;
  name: string;
  address: string | null;
  createdByUserId: number;
};

export type CreateSavedVenueInput = {
  name: string;
  address?: string | null;
};

/** GET /saved-venues: the whole club's list, sorted by name. */
export function listSavedVenues(): Promise<SavedVenue[]> {
  return requestJson('/saved-venues');
}

/** A duplicate name gives a 400 with the server's message. */
export function createSavedVenue(input: CreateSavedVenueInput): Promise<SavedVenue> {
  return requestJson('/saved-venues', withJson('POST', input));
}

/** Old trainings and matches keep their venue text. */
export function deleteSavedVenue(id: number): Promise<void> {
  return requestVoid(`/saved-venues/${id}`, { method: 'DELETE' });
}
