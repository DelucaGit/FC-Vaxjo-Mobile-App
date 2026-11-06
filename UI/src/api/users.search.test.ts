import { API_BASE_URL } from './config';
import { apiFetch } from './http';
import { searchByName, searchByPhone, searchByShirtNumber } from './users';

jest.mock('./http', () => {
  const actual = jest.requireActual('./http');
  return {
    ...actual,
    apiFetch: jest.fn(),
  };
});

const mockedFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const ROLE_NOT_READY = 'Den här funktionen är inte tillgänglig för din roll än.';

const oneUser = {
  id: 7,
  name: 'Nova',
  email: 'nova@fcvaxjo.se',
  roleName: 'PLAYER',
  playerNumber: 9,
  mobilePhoneNumber: '0701234567',
  parentId: null,
  parentName: null,
  parentEmail: null,
  parentMobilePhoneNumber: null,
  teamId: 1,
  teamName: 'P15',
  active: true,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * The search value must be in the body. A query string would put a phone
 * number in the access log (F1, ADR 0004).
 */
function expectSearchPost(body: { name: string } | { playerNumber: number } | { phone: string }) {
  expect(mockedFetch).toHaveBeenCalledTimes(1);
  const [url, init] = mockedFetch.mock.calls[0];
  expect(url).toBe(`${API_BASE_URL}/users/search`);
  expect(url).not.toContain('?');
  expect(init).toEqual({
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('user search', () => {
  test('name search posts the name and returns the list', async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, [oneUser]));

    const users = await searchByName('Nova');

    expectSearchPost({ name: 'Nova' });
    expect(users).toEqual([oneUser]);
  });

  test('shirt search posts playerNumber and returns one user', async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, oneUser));

    const user = await searchByShirtNumber(9);

    expectSearchPost({ playerNumber: 9 });
    expect(user).toEqual(oneUser);
  });

  test('phone search posts the phone and returns one user', async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, oneUser));

    const user = await searchByPhone('0701234567');

    expectSearchPost({ phone: '0701234567' });
    expect(user).toEqual(oneUser);
  });

  test('a 400 from search keeps the server message', async () => {
    const message = 'Send exactly one of name, playerNumber or phone';
    mockedFetch.mockResolvedValue(jsonResponse(400, { message }));

    await expect(searchByName('Nova')).rejects.toThrow(message);
    expectSearchPost({ name: 'Nova' });
  });

  test('a bare 403 from search becomes the role message', async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, { message: 'Access Denied' }));

    await expect(searchByPhone('0701234567')).rejects.toThrow(ROLE_NOT_READY);
    expectSearchPost({ phone: '0701234567' });
  });

  test('a 404 from search keeps User not found', async () => {
    mockedFetch.mockResolvedValue(jsonResponse(404, { message: 'User not found' }));

    await expect(searchByShirtNumber(9)).rejects.toThrow('User not found');
    expectSearchPost({ playerNumber: 9 });
  });
});
