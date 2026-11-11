import { fireEvent, render, screen } from '@testing-library/react-native';
import { listMyTeams } from '../api/teams';
import { getUser } from '../api/users';
import { makeNavigation, makeSession, makeUser } from '../components/users/testUtils';
import PlayerViewScreen from './PlayerViewScreen';

// The first render loads the icon and navigation code, which can pass 5 s on a busy machine.
jest.setTimeout(20000);

jest.mock('../api/users', () => ({ getUser: jest.fn() }));
jest.mock('../api/teams', () => ({ listMyTeams: jest.fn() }));

let mockSession = makeSession('ADMIN', 100);
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

// Outside a navigator, run the focus effect like a normal effect.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

const mockedGet = getUser as jest.MockedFunction<typeof getUser>;
const mockedMyTeams = listMyTeams as jest.MockedFunction<typeof listMyTeams>;

const player = makeUser({
  id: 7,
  name: 'Elsa Berg',
  email: 'elsa@fcvaxjo.se',
  mobilePhoneNumber: '070-555 66 77',
  playerNumber: 9,
  teamId: 5,
  teamName: 'F12',
  parentId: 20,
  parentName: 'Anna Berg',
  parentMobilePhoneNumber: '070-999 88 77',
});

async function renderView() {
  const navigation = makeNavigation(['Squad', 'PlayerView', 'PlayerProfile']);
  await render(
    <PlayerViewScreen navigation={navigation as never} route={{ params: { userId: 7 } } as never} />,
  );
  return navigation;
}

describe('PlayerViewScreen', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedMyTeams.mockReset();
    mockedGet.mockResolvedValue(player);
    mockSession = makeSession('ADMIN', 100);
  });

  test('shows the details read only, with phone and mail links and the parent', async () => {
    await renderView();

    expect(await screen.findByLabelText('Ring 070-555 66 77')).toBeTruthy();
    expect(screen.getByText('F12')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByLabelText('Mejla elsa@fcvaxjo.se')).toBeTruthy();
    expect(screen.getByText('Anna Berg')).toBeTruthy();
    expect(screen.getByLabelText('Ring 070-999 88 77')).toBeTruthy();
    // No text inputs: nothing can be changed by mistake here.
    // Every text input has a display value, even an empty one, so this finds them all.
    expect(screen.queryAllByDisplayValue(/.*/)).toHaveLength(0);
  });

  test('"Redigera" opens the edit form', async () => {
    const navigation = await renderView();

    await fireEvent.press(await screen.findByRole('button', { name: 'Redigera' }));

    expect(navigation.navigate).toHaveBeenCalledWith('PlayerProfile', { userId: 7 });
  });

  test.each(['ADMIN', 'CHAIRMAN'])('%s sees "Redigera"', async (role) => {
    mockSession = makeSession(role, 100);
    await renderView();

    expect(await screen.findByRole('button', { name: 'Redigera' })).toBeTruthy();
    expect(mockedMyTeams).not.toHaveBeenCalled();
  });

  test('a coach of the player\'s team sees "Redigera"', async () => {
    mockSession = makeSession('COACH', 100);
    mockedMyTeams.mockResolvedValue([{ id: 5, name: 'F12' }]);
    await renderView();

    expect(await screen.findByRole('button', { name: 'Redigera' })).toBeTruthy();
  });

  test('a coach of another team does not see "Redigera"', async () => {
    mockSession = makeSession('COACH', 100);
    mockedMyTeams.mockResolvedValue([{ id: 6, name: 'P14' }]);
    await renderView();

    expect(await screen.findByLabelText('Ring 070-555 66 77')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Redigera' })).toBeNull();
  });
});
