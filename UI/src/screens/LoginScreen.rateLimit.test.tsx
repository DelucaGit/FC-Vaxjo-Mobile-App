import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';

// useAuth().login calls the real api/auth login, so the whole path from
// the fetch response to the text on screen is tested.
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: null,
    loading: false,
    login: (email: string, password: string) =>
      jest.requireActual('../api/auth').login(email, password),
    changePassword: async () => {},
    logout: async () => {},
  }),
}));

async function tryLogin() {
  await render(<LoginScreen />);
  // In Testing Library v14 fireEvent is async, so each call is awaited.
  await fireEvent.changeText(screen.getByLabelText('E-post'), 'anna@fcvaxjo.se');
  await fireEvent.changeText(screen.getByLabelText('Lösenord'), 'wrong-guess');
  await fireEvent.press(screen.getByRole('button', { name: 'Logga in' }));
}

describe('LoginScreen against the real login function', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn() as typeof fetch;
  });

  test('shows the Swedish lockout message when the API answers 429', async () => {
    // Empty body: the message must not depend on what the server or a proxy sends.
    (globalThis.fetch as jest.Mock).mockResolvedValue(new Response('', { status: 429 }));

    await tryLogin();

    expect(
      await screen.findByText('För många försök. Vänta en stund och försök igen.'),
    ).toBeTruthy();
  });

  test('shows "Fel e-post eller lösenord" when the API answers 401', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid email or password' }), { status: 401 }),
    );

    await tryLogin();

    expect(await screen.findByText('Fel e-post eller lösenord')).toBeTruthy();
  });
});
