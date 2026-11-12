import { fireEvent, render, screen } from '@testing-library/react-native';
import { changeUserRole, getUser, resetPassword } from '../api/users';
import { makeNavigation, makeSession, makeUser } from '../components/users/testUtils';
import UserDetailScreen from './UserDetailScreen';

jest.mock('../api/users', () => ({
  getUser: jest.fn(),
  changeUserRole: jest.fn(),
  resetPassword: jest.fn(),
}));

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
const mockedReset = resetPassword as jest.MockedFunction<typeof resetPassword>;

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
    mockedReset.mockReset();
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

  describe('Återställ lösenord', () => {
    const chairman = makeUser({ id: 9, name: 'Ann Ord', roleName: 'CHAIRMAN' });
    const RESET = 'Återställ lösenord';

    test.each([
      ['ADMIN on a chairman', 'ADMIN', 100, chairman, true],
      ['CHAIRMAN on a coach', 'CHAIRMAN', 100, coach, true],
      ['CHAIRMAN on a chairman', 'CHAIRMAN', 100, chairman, false],
      ['COACH on a player', 'COACH', 100, player, false],
      ['ADMIN on themselves', 'ADMIN', 8, coach, false],
      ['ADMIN on an inactive user', 'ADMIN', 100, { ...coach, active: false }, false],
    ])('%s: button shown = %s', async (_name, role, myId, target, shown) => {
      mockSession = makeSession(role, myId);
      mockedGet.mockResolvedValue(target);
      await renderDetail(target.id);

      await screen.findAllByText(target.name);
      expect(screen.queryByRole('button', { name: RESET }) != null).toBe(shown);
    });

    test('asks first, then shows the temporary password once', async () => {
      mockedGet.mockResolvedValue(coach);
      const fakeTemp = 'Tmp-1234';
      mockedReset.mockResolvedValue({ id: 8, temporaryPassword: fakeTemp });
      await renderDetail(8);

      await fireEvent.press(await screen.findByRole('button', { name: RESET }));
      expect(screen.getByText('Det gamla lösenordet slutar fungera direkt.')).toBeTruthy();
      expect(mockedReset).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: 'Återställ' }));
      expect(mockedReset).toHaveBeenCalledWith(8);
      expect(await screen.findByText('Tillfälligt lösenord: Tmp-1234')).toBeTruthy();

      // "Klar" goes back to the user, and the password is gone.
      await fireEvent.press(screen.getByRole('button', { name: 'Klar' }));
      expect(screen.queryByText('Tillfälligt lösenord: Tmp-1234')).toBeNull();
      expect(screen.getByRole('button', { name: RESET })).toBeTruthy();
    });

    test('"Avbryt" does not reset', async () => {
      mockedGet.mockResolvedValue(coach);
      await renderDetail(8);

      await fireEvent.press(await screen.findByRole('button', { name: RESET }));
      await fireEvent.press(screen.getByRole('button', { name: 'Avbryt' }));

      expect(mockedReset).not.toHaveBeenCalled();
    });

    test('a refused reset shows the message from the API module', async () => {
      mockedGet.mockResolvedValue(coach);
      mockedReset.mockRejectedValue(new Error('Användaren hittades inte.'));
      await renderDetail(8);

      await fireEvent.press(await screen.findByRole('button', { name: RESET }));
      await fireEvent.press(screen.getByRole('button', { name: 'Återställ' }));

      expect(await screen.findByText('Användaren hittades inte.')).toBeTruthy();
    });
  });
});
