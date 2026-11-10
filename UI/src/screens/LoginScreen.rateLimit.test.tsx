import { fireEvent, render, screen } from '@testing-library/react-native';
import { TOO_MANY_LOGIN_ATTEMPTS_MESSAGE } from '../api/auth';
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

describe('LoginScreen 429', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn() as typeof fetch;
  });

  test('shows the Swedish lockout message when the API answers 429', async () => {
    // Empty body: the message must not depend on what the server or a proxy sends.
    (globalThis.fetch as jest.Mock).mockResolvedValue(new Response('', { status: 429 }));

    await render(<LoginScreen />);
    // In Testing Library v14 fireEvent is async, so each call is awaited.
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrong-guess');
    await fireEvent.press(screen.getByText('Sign in'));

    expect(await screen.findByText(TOO_MANY_LOGIN_ATTEMPTS_MESSAGE)).toBeTruthy();
    expect(TOO_MANY_LOGIN_ATTEMPTS_MESSAGE).toBe(
      'För många inloggningsförsök. Försök igen om 15 minuter.',
    );
  });
});
