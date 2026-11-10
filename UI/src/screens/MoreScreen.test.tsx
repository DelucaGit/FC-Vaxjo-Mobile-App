import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getUserById } from '../api/users';
import type { AppStackParamList } from '../navigation/types';
import MoreChangePasswordScreen from './MoreChangePasswordScreen';
import MoreScreen from './MoreScreen';

const mockLogout = jest.fn();
const mockChangePassword = jest.fn();

jest.mock('../api/users', () => ({ getUserById: jest.fn() }));
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      token: 't',
      userId: 3,
      email: 'anna@fcvaxjo.se',
      roleName: 'CHAIRMAN',
      mustChangePassword: false,
    },
    loading: false,
    login: jest.fn(),
    changePassword: mockChangePassword,
    logout: mockLogout,
  }),
}));

const mockGetUserById = getUserById as jest.Mock;

function navProps<K extends 'More' | 'ChangePassword'>() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return {
    navigation,
    props: { navigation, route: {} } as unknown as NativeStackScreenProps<AppStackParamList, K>,
  };
}

describe('MoreScreen', () => {
  test('shows name and role, and only the two rows', async () => {
    mockGetUserById.mockResolvedValue({ id: 3, name: 'Anna Ek' });
    const { props } = navProps<'More'>();
    await render(<MoreScreen {...props} />);

    expect(await screen.findByText('Anna Ek')).toBeTruthy();
    expect(screen.getByText('Ordförande')).toBeTruthy();
    expect(screen.getByText('Byt lösenord')).toBeTruthy();
    expect(screen.getByText('Logga ut')).toBeTruthy();
    expect(screen.queryByText('Byt roll')).toBeNull();
    expect(mockGetUserById).toHaveBeenCalledWith(3);
  });

  test('shows the e-mail when the role may not read its own user', async () => {
    mockGetUserById.mockRejectedValue(new Error('403'));
    const { props } = navProps<'More'>();
    await render(<MoreScreen {...props} />);

    expect(await screen.findByText('anna@fcvaxjo.se')).toBeTruthy();
  });

  test('"Byt lösenord" opens the change-password screen', async () => {
    mockGetUserById.mockResolvedValue({ id: 3, name: 'Anna Ek' });
    const { navigation, props } = navProps<'More'>();
    await render(<MoreScreen {...props} />);

    await fireEvent.press(screen.getByText('Byt lösenord'));

    expect(navigation.navigate).toHaveBeenCalledWith('ChangePassword');
  });

  test('"Logga ut" logs out', async () => {
    mockGetUserById.mockResolvedValue({ id: 3, name: 'Anna Ek' });
    const { props } = navProps<'More'>();
    await render(<MoreScreen {...props} />);

    await fireEvent.press(screen.getByText('Logga ut'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe('MoreChangePasswordScreen', () => {
  test('has a back arrow and goes back after saving', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    const { navigation, props } = navProps<'ChangePassword'>();
    await render(<MoreChangePasswordScreen {...props} />);

    expect(screen.getByLabelText('Tillbaka')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Nuvarande lösenord'), 'gammalt1');
    await fireEvent.changeText(screen.getByLabelText('Nytt lösenord'), 'nyttlosen1');
    await fireEvent.changeText(screen.getByLabelText('Bekräfta'), 'nyttlosen1');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(mockChangePassword).toHaveBeenCalledWith('gammalt1', 'nyttlosen1');
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
