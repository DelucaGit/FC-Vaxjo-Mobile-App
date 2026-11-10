import { fireEvent, render, screen } from '@testing-library/react-native';
import { listUsers } from '../api/users';
import { makeNavigation, makeUser } from '../components/users/testUtils';
import UsersScreen from './UsersScreen';

jest.mock('../api/users', () => ({ listUsers: jest.fn() }));

// No NavigationContainer in this test: run the focus effect once on mount instead.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

const mockedList = listUsers as jest.MockedFunction<typeof listUsers>;

async function renderUsers() {
  const navigation = makeNavigation(['Users', 'UserDetail', 'NewUser']);
  await render(<UsersScreen navigation={navigation as never} route={{} as never} />);
  return navigation;
}

describe('UsersScreen', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedList.mockResolvedValue([
      makeUser({ id: 1, name: 'Elsa Berg', teamName: 'F12' }),
      makeUser({ id: 2, name: 'Bo Ek', roleName: 'COACH', teamName: null }),
    ]);
  });

  test('shows "Roll · Lag" for a player and only the role for others', async () => {
    await renderUsers();

    expect(await screen.findByText('Spelare · F12')).toBeTruthy();
    expect(screen.getByText('Tränare')).toBeTruthy();
  });

  test('the search field filters the list by name', async () => {
    await renderUsers();
    await screen.findByText('Elsa Berg');

    await fireEvent.changeText(screen.getByLabelText('Sök'), 'bo');

    expect(screen.queryByText('Elsa Berg')).toBeNull();
    expect(screen.getByText('Bo Ek')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Sök'), 'xyz');
    expect(screen.getByText('Inga träffar')).toBeTruthy();
  });

  test('a row opens UserDetail and the bottom button opens NewUser', async () => {
    const navigation = await renderUsers();

    await fireEvent.press(await screen.findByText('Bo Ek'));
    expect(navigation.navigate).toHaveBeenCalledWith('UserDetail', { userId: 2 });

    await fireEvent.press(screen.getByRole('button', { name: 'Ny användare' }));
    expect(navigation.navigate).toHaveBeenCalledWith('NewUser');
  });

  test('a 403 shows the message from the API module', async () => {
    mockedList.mockRejectedValue(new Error('Du saknar behörighet för det här.'));
    await renderUsers();

    expect(await screen.findByText('Du saknar behörighet för det här.')).toBeTruthy();
  });
});
