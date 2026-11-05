import { apiFetch } from './http';
import { createUser } from './users';

jest.mock('./http', () => {
  const actual = jest.requireActual('./http');
  return {
    ...actual,
    apiFetch: jest.fn(),
  };
});

const mockedFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

// Creating a player or a parent both go through POST /api/users.
// The API still rejects CHAIRMAN with a bare 403. The screen shows this text.
test('create user turns a bare 403 into the role message', async () => {
  mockedFetch.mockResolvedValue(
    new Response(JSON.stringify({ message: 'Access Denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  await expect(
    createUser({
      name: 'Nova',
      email: 'nova@fcvaxjo.se',
      roleName: 'PLAYER',
    }),
  ).rejects.toThrow('Den här funktionen är inte tillgänglig för din roll än.');
});
