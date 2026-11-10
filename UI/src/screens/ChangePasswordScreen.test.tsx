import { fireEvent, render, screen } from '@testing-library/react-native';
import ChangePasswordScreen from './ChangePasswordScreen';

const mockChangePassword = jest.fn();
const mockLogout = jest.fn();

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      token: 't',
      userId: 7,
      email: 'ny@fcvaxjo.se',
      roleName: 'PLAYER',
      mustChangePassword: true,
    },
    loading: false,
    login: jest.fn(),
    changePassword: mockChangePassword,
    logout: mockLogout,
  }),
}));

async function fill(current: string, next: string, confirm: string) {
  await fireEvent.changeText(screen.getByLabelText('Nuvarande lösenord'), current);
  await fireEvent.changeText(screen.getByLabelText('Nytt lösenord'), next);
  await fireEvent.changeText(screen.getByLabelText('Bekräfta'), confirm);
}

describe('ChangePasswordScreen (forced first-login change)', () => {
  test('has no back arrow, only the form and "Logga ut"', async () => {
    await render(<ChangePasswordScreen />);

    expect(screen.queryByLabelText('Tillbaka')).toBeNull();
    expect(screen.getByRole('button', { name: 'Logga ut' })).toBeTruthy();
  });

  test('"Spara" is locked until filled, and shows "Lösenorden matchar inte"', async () => {
    await render(<ChangePasswordScreen />);
    const save = screen.getByRole('button', { name: 'Spara' });
    expect(save).toBeDisabled();

    await fill('tillfalligt', 'nyttlosen1', 'nyttlosen2');
    expect(screen.getByText('Lösenorden matchar inte')).toBeTruthy();
    expect(save).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Bekräfta'), 'nyttlosen1');
    expect(screen.queryByText('Lösenorden matchar inte')).toBeNull();
    expect(save).toBeEnabled();
  });

  test('saves with the current and the new password', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    await render(<ChangePasswordScreen />);

    await fill('tillfalligt', 'nyttlosen1', 'nyttlosen1');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(mockChangePassword).toHaveBeenCalledWith('tillfalligt', 'nyttlosen1');
  });

  test('shows the server error in Swedish', async () => {
    mockChangePassword.mockRejectedValue(new Error('Current password is wrong'));
    await render(<ChangePasswordScreen />);

    await fill('fel', 'nyttlosen1', 'nyttlosen1');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(await screen.findByText('Nuvarande lösenord är fel')).toBeTruthy();
  });

  test('"Logga ut" logs out', async () => {
    await render(<ChangePasswordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Logga ut' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
