import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import MoreChangePasswordScreen from './MoreChangePasswordScreen';

const mockChangePassword = jest.fn();

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
    logout: jest.fn(),
  }),
}));

// Moved here from MoreScreen.test.tsx when the "Mer" page was removed (#206).
describe('MoreChangePasswordScreen', () => {
  test('has a back arrow and goes back after saving', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const props = { navigation, route: {} } as unknown as NativeStackScreenProps<
      AppStackParamList,
      'ChangePassword'
    >;
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
