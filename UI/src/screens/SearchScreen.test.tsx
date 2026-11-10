import { fireEvent, render, screen } from '@testing-library/react-native';
import { searchUsers } from '../api/users';
import { makeNavigation, makeSession, makeUser } from '../components/users/testUtils';
import SearchScreen from './SearchScreen';

jest.mock('../api/users', () => ({ searchUsers: jest.fn() }));

let mockSession = makeSession('COACH');
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

const mockedSearch = searchUsers as jest.MockedFunction<typeof searchUsers>;

async function renderSearch(routeNames: string[] = ['Search', 'PlayerProfile']) {
  const navigation = makeNavigation(routeNames);
  // The screen only uses navigate and getState, so a plain object is enough here.
  await render(<SearchScreen navigation={navigation as never} route={{} as never} />);
  return navigation;
}

async function searchFor(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Sök'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Sök' }));
}

describe('SearchScreen', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
    mockSession = makeSession('COACH');
  });

  test('name search sends name and opens the player profile', async () => {
    mockedSearch.mockResolvedValue([
      makeUser({ id: 7, name: 'Elsa Berg', teamName: 'F12', playerNumber: 9 }),
    ]);
    const navigation = await renderSearch();

    await searchFor(' Els ');

    expect(mockedSearch).toHaveBeenCalledWith({ name: 'Els' });
    expect(await screen.findByText('Elsa Berg')).toBeTruthy();
    expect(screen.getByText('Spelare · F12')).toBeTruthy();

    await fireEvent.press(screen.getByText('Elsa Berg'));
    expect(navigation.navigate).toHaveBeenCalledWith('PlayerProfile', { userId: 7 });
  });

  test('shirt number search sends playerNumber as a number', async () => {
    mockedSearch.mockResolvedValue([makeUser({ id: 3, name: 'Nils Ek' })]);
    await renderSearch();

    await fireEvent.press(screen.getByRole('radio', { name: 'Tröjnr' }));
    await searchFor('10');

    expect(mockedSearch).toHaveBeenCalledWith({ playerNumber: 10 });
    expect(await screen.findByText('Nils Ek')).toBeTruthy();
  });

  test('shirt number must be digits before Sök can be pressed', async () => {
    await renderSearch();

    await fireEvent.press(screen.getByRole('radio', { name: 'Tröjnr' }));
    await fireEvent.changeText(screen.getByLabelText('Sök'), 'tio');

    expect(screen.getByRole('button', { name: 'Sök' })).toBeDisabled();
  });

  test('phone search sends phone, and a 404 shows "Inga träffar"', async () => {
    mockedSearch.mockRejectedValue(new Error('User not found'));
    await renderSearch();

    await fireEvent.press(screen.getByRole('radio', { name: 'Telefon' }));
    await searchFor('0701234567');

    expect(mockedSearch).toHaveBeenCalledWith({ phone: '0701234567' });
    expect(await screen.findByText('Inga träffar')).toBeTruthy();
  });

  test('a coach only sees players', async () => {
    mockedSearch.mockResolvedValue([
      makeUser({ id: 1, name: 'Anna Spelare' }),
      makeUser({ id: 2, name: 'Anna Förälder', roleName: 'PARENT' }),
    ]);
    await renderSearch();

    await searchFor('Anna');

    expect(await screen.findByText('Anna Spelare')).toBeTruthy();
    expect(screen.queryByText('Anna Förälder')).toBeNull();
  });

  test('a non-player opens UserDetail when the stack has it', async () => {
    mockSession = makeSession('ADMIN');
    mockedSearch.mockResolvedValue([makeUser({ id: 5, name: 'Bo Tränare', roleName: 'COACH' })]);
    const navigation = await renderSearch(['Search', 'PlayerProfile', 'UserDetail']);

    await searchFor('Bo');
    await fireEvent.press(await screen.findByText('Bo Tränare'));

    expect(navigation.navigate).toHaveBeenCalledWith('UserDetail', { userId: 5 });
  });

  test('a 403 shows the message from the API module', async () => {
    mockedSearch.mockRejectedValue(new Error('Du saknar behörighet för det här.'));
    await renderSearch();

    await searchFor('Anna');

    expect(await screen.findByText('Du saknar behörighet för det här.')).toBeTruthy();
  });
});
