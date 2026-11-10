import type { ClubUser } from '../../api/users';

/** A user as the API sends it, with only the fields a test cares about changed. */
export function makeUser(overrides: Partial<ClubUser>): ClubUser {
  return {
    id: 1,
    name: 'Test Person',
    email: 'test@fcvaxjo.se',
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
    ...overrides,
  };
}

/** A stand-in for the stack's navigation prop. routeNames is what this stack registers. */
export function makeNavigation(routeNames: string[] = []) {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    getState: () => ({ routeNames }),
  };
}

export function makeSession(roleName: string, userId = 100) {
  return {
    token: 't',
    roleName,
    email: 'me@fcvaxjo.se',
    userId,
    mustChangePassword: false,
  };
}
