import { fireEvent, render, screen } from '@testing-library/react-native';
import { changeUserRole, getUser } from '../api/users';
import { makeNavigation, makeSession, makeUser } from '../components/users/testUtils';
import UserDetailScreen from './UserDetailScreen';

jest.mock('../api/users', () => ({ getUser: jest.fn(), changeUserRole: jest.fn() }));

let mockSession = makeSession('CHAIRMAN', 100);
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

const mockedGet = getUser as jest.MockedFunction<typeof getUser>;
const mockedChange = changeUserRole as jest.MockedFunction<typeof changeUserRole>;

const player = makeUser({
  id: 7,
  name: 'Elsa Berg',
  email: 'elsa@fcvaxjo.se',
  teamName: 'F12',
  playerNumber: 9,
});
const coach = makeUser({
  id: 8,
  name: 'Bo Ek',
  email: 'bo@fcvaxjo.se',
  roleName: 'COACH',
  mobilePhoneNumber: '0701234567',
});

async function renderDetail(userId: number) {
  const navigation = makeNavigation(['Users', 'UserDetail', 'PlayerProfile']);
  await render(
    <UserDetailScreen navigation={navigation as never} route={{ params: { userId } } as never} />,
  );
  return navigation;
}

describe('UserDetailScreen', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedChange.mockReset();
    mockSession = makeSession('CHAIRMAN', 100);
  });

  test('another role is read-only: info rows, no edit and no role change', async () => {
    mockedGet.mockResolvedValue(coach);
    await renderDetail(8);

    expect(await screen.findByLabelText('Mejla bo@fcvaxjo.se')).toBeTruthy();
    expect(screen.getByLabelText('Ring 0701234567')).toBeTruthy();
    expect(screen.getByText('Tränare')).toBeTruthy();
    expect(screen.queryByText('Redigera spelare')).toBeNull();
    expect(screen.queryByText('Gör till tränare')).toBeNull();
    expect(screen.queryByLabelText('Ändra roll')).toBeNull();
  });

  test('a player has "Redigera spelare", which opens the player profile', async () => {
    mockedGet.mockResolvedValue(player);
    const navigation = await renderDetail(7);

    await fireEvent.press(await screen.findByText('Redigera spelare'));

    expect(navigation.navigate).toHaveBeenCalledWith('PlayerProfile', { userId: 7 });
  });

  test('chairman makes a player a coach after confirming, and cannot pick other roles', async () => {
    mockedGet.mockResolvedValue(player);
    mockedChange.mockResolvedValue({ id: 7, roleName: 'COACH' });
    await renderDetail(7);

    // No role picker at all, so Admin and Ordförande cannot be chosen.
    await screen.findByText('Gör till tränare');
    expect(screen.queryByLabelText('Ändra roll')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Gör till tränare' }));
    expect(screen.getByText('Tröjnummer, lag och förälder tas bort.')).toBeTruthy();
    expect(mockedChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Bekräfta' }));
    expect(mockedChange).toHaveBeenCalledWith(7, 'COACH');
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  test('admin changes another user\'s role after confirming', async () => {
    mockSession = makeSession('ADMIN', 100);
    mockedGet.mockResolvedValue(coach);
    mockedChange.mockResolvedValue({ id: 8, roleName: 'CHAIRMAN' });
    await renderDetail(8);

    await fireEvent.press(await screen.findByLabelText('Ändra roll'));
    await fireEvent.press(screen.getByRole('button', { name: 'Ordförande' }));
    expect(screen.getByText('Tröjnummer, lag och förälder tas bort.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Bekräfta' }));
    expect(mockedChange).toHaveBeenCalledWith(8, 'CHAIRMAN');
  });

  test('admin cannot change their own role', async () => {
    mockSession = makeSession('ADMIN', 8);
    mockedGet.mockResolvedValue(coach);
    await renderDetail(8);

    expect(await screen.findByLabelText('Mejla bo@fcvaxjo.se')).toBeTruthy();
    expect(screen.queryByLabelText('Ändra roll')).toBeNull();
  });

  test('a refused role change shows the message from the API module', async () => {
    mockedGet.mockResolvedValue(player);
    mockedChange.mockRejectedValue(new Error('Du saknar behörighet för det här.'));
    await renderDetail(7);

    await fireEvent.press(await screen.findByRole('button', { name: 'Gör till tränare' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Bekräfta' }));

    expect(await screen.findByText('Du saknar behörighet för det här.')).toBeTruthy();
  });
});
