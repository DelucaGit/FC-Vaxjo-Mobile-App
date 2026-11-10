import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';

const mockLogin = jest.fn();

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: null,
    loading: false,
    login: mockLogin,
    changePassword: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('LoginScreen', () => {
  test('has logo title, both fields and no role picker', async () => {
    await render(<LoginScreen />);

    expect(screen.getByText('FC Växjö')).toBeTruthy();
    expect(screen.getByLabelText('E-post')).toBeTruthy();
    expect(screen.getByLabelText('Lösenord')).toBeTruthy();
    expect(screen.queryByText(/Visa som/)).toBeNull();
  });

  test('"Logga in" is locked until both fields have text', async () => {
    await render(<LoginScreen />);
    const button = screen.getByRole('button', { name: 'Logga in' });
    expect(button).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('E-post'), 'anna@fcvaxjo.se');
    expect(button).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Lösenord'), 'hemligt1');
    expect(button).toBeEnabled();
  });

  test('sends the trimmed e-mail and the password to login', async () => {
    mockLogin.mockResolvedValue(undefined);
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('E-post'), '  anna@fcvaxjo.se ');
    await fireEvent.changeText(screen.getByLabelText('Lösenord'), 'hemligt1');
    await fireEvent.press(screen.getByRole('button', { name: 'Logga in' }));

    expect(mockLogin).toHaveBeenCalledWith('anna@fcvaxjo.se', 'hemligt1');
  });

  test('shows a Swedish text when the server cannot be reached', async () => {
    mockLogin.mockRejectedValue(new TypeError('Network request failed'));
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('E-post'), 'anna@fcvaxjo.se');
    await fireEvent.changeText(screen.getByLabelText('Lösenord'), 'hemligt1');
    await fireEvent.press(screen.getByRole('button', { name: 'Logga in' }));

    expect(await screen.findByText('Kunde inte nå servern. Försök igen.')).toBeTruthy();
  });
});
