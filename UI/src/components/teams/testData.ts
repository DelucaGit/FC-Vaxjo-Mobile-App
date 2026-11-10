import type { ClubUser } from '../../api/users';

/** Test helpers for the team screens. Only imported by *.test.tsx files. */

export function makeUser(fields: Partial<ClubUser> & { id: number; name: string }): ClubUser {
  return {
    email: `${fields.name.split(' ')[0].toLowerCase()}@test.se`,
    roleName: 'PLAYER',
    playerNumber: null,
    mobilePhoneNumber: null,
    parentId: null,
    parentName: null,
    parentEmail: null,
    parentMobilePhoneNumber: null,
    teamId: null,
    teamName: null,
    active: true,
    ...fields,
  };
}

/** Just the two calls the screens use; cast to the screen's props type in a test. */
export function makeNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn() };
}

/** The real Swedish text the API layer makes from a generic Spring 403. */
export async function forbiddenError(): Promise<Error> {
  const { readErrorMessage } = jest.requireActual('../../api/http');
  const response = new Response(JSON.stringify({ message: 'Access Denied' }), { status: 403 });
  return new Error(await readErrorMessage(response));
}

export const FORBIDDEN_TEXT = 'Den här funktionen är inte tillgänglig för din roll än.';
