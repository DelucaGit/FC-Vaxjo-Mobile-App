import { readErrorMessage } from './http';

const ROLE_NOT_READY = 'Den här funktionen är inte tillgänglig för din roll än.';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('readErrorMessage', () => {
  test('a bare 403 becomes a clear message for the role', async () => {
    const message = await readErrorMessage(
      jsonResponse(403, { message: 'Access Denied' }),
    );
    expect(message).toBe(ROLE_NOT_READY);
  });

  test('an empty 403 does not become a crash or a status code', async () => {
    const message = await readErrorMessage(new Response('', { status: 403 }));
    expect(message).toBe(ROLE_NOT_READY);
  });

  test('a specific 403 reason is kept', async () => {
    const reason = 'Only ADMIN or a coach of this team can manage trainings';
    const message = await readErrorMessage(jsonResponse(403, { message: reason }));
    expect(message).toBe(reason);
  });

  test('other errors stay as the server wrote them', async () => {
    const message = await readErrorMessage(
      jsonResponse(400, { message: 'Team name is required' }),
    );
    expect(message).toBe('Team name is required');
  });
});
