import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { listTeamCoaches, listTeamPlayers, listTeams } from '../api/teams';
import {
  FORBIDDEN_TEXT,
  forbiddenError,
  makeNavigation,
  makeUser,
} from '../components/teams/testData';
import { deferred } from '../test/deferred';
import { pullToRefresh } from '../test/pullToRefresh';
import TeamsScreen from './TeamsScreen';

jest.mock('../api/teams');
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

type Props = ComponentProps<typeof TeamsScreen>;

async function renderTeams() {
  const navigation = makeNavigation();
  const props = { navigation, route: { key: 'Teams', name: 'Teams' } } as unknown as Props;
  await render(<TeamsScreen {...props} />);
  return navigation;
}

describe('TeamsScreen', () => {
  test('lists teams with player count and coach names', async () => {
    jest.mocked(listTeams).mockResolvedValue([
      { id: 1, name: 'P14' },
      { id: 2, name: 'F12' },
    ]);
    jest.mocked(listTeamPlayers).mockImplementation(async (teamId) =>
      teamId === 1
        ? [makeUser({ id: 10, name: 'Elsa Ek' }), makeUser({ id: 11, name: 'Leo Ek' })]
        : [],
    );
    jest.mocked(listTeamCoaches).mockImplementation(async (teamId) =>
      teamId === 1
        ? [
            makeUser({ id: 3, name: 'Johan Berg', roleName: 'COACH' }),
            makeUser({ id: 4, name: 'Sara Nilsson', roleName: 'COACH' }),
          ]
        : [],
    );
    const navigation = await renderTeams();

    expect(await screen.findByText('2 spelare · Johan Berg, Sara Nilsson')).toBeTruthy();
    expect(screen.getByText('0 spelare')).toBeTruthy();

    await fireEvent.press(screen.getByText('P14'));
    expect(navigation.navigate).toHaveBeenCalledWith('TeamDetail', { teamId: 1 });

    await fireEvent.press(screen.getByRole('button', { name: 'Nytt lag' }));
    expect(navigation.navigate).toHaveBeenCalledWith('NewTeam');
  });

  test('shows Inga lag when the club has no teams', async () => {
    jest.mocked(listTeams).mockResolvedValue([]);
    await renderTeams();

    expect(await screen.findByText('Inga lag')).toBeTruthy();
  });

  test('pulling the list down loads the teams again', async () => {
    jest.mocked(listTeams).mockResolvedValueOnce([{ id: 1, name: 'P14' }]);
    jest.mocked(listTeamPlayers).mockResolvedValue([]);
    jest.mocked(listTeamCoaches).mockResolvedValue([]);
    await renderTeams();
    expect(await screen.findByText('P14')).toBeTruthy();

    jest.mocked(listTeams).mockResolvedValueOnce([
      { id: 1, name: 'P14' },
      { id: 2, name: 'F12' },
    ]);
    await pullToRefresh();

    expect(await screen.findByText('F12')).toBeTruthy();
  });

  test('a failed refresh shows the same Swedish message', async () => {
    jest.mocked(listTeams).mockResolvedValueOnce([]);
    await renderTeams();
    expect(await screen.findByText('Inga lag')).toBeTruthy();

    jest.mocked(listTeams).mockRejectedValueOnce(await forbiddenError());
    await pullToRefresh();

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
  });

  test('shows the Swedish message on 403', async () => {
    jest.mocked(listTeams).mockRejectedValue(await forbiddenError());
    await renderTeams();

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
  });
});

describe('TeamsScreen while loading', () => {
  beforeEach(() => {
    jest.mocked(listTeamPlayers).mockResolvedValue([]);
    jest.mocked(listTeamCoaches).mockResolvedValue([]);
  });

  test('shows grey placeholder rows until the teams arrive', async () => {
    const teams = deferred<Awaited<ReturnType<typeof listTeams>>>();
    jest.mocked(listTeams).mockReturnValue(teams.promise);
    await renderTeams();

    expect(screen.getByLabelText('Laddar')).toBeOnTheScreen();
    expect(screen.queryByText('P14')).toBeNull();

    await teams.resolve([{ id: 1, name: 'P14' }]);

    expect(await screen.findByText('P14')).toBeTruthy();
    expect(screen.queryByLabelText('Laddar')).toBeNull();
  });

  test('shows the error instead of the placeholder when loading fails', async () => {
    const teams = deferred<Awaited<ReturnType<typeof listTeams>>>();
    jest.mocked(listTeams).mockReturnValue(teams.promise);
    await renderTeams();
    expect(screen.getByLabelText('Laddar')).toBeOnTheScreen();

    await teams.reject(await forbiddenError());

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
    expect(screen.queryByLabelText('Laddar')).toBeNull();
  });

  test('pull-to-refresh keeps the list on screen, without placeholder rows', async () => {
    jest.mocked(listTeams).mockResolvedValueOnce([{ id: 1, name: 'P14' }]);
    await renderTeams();
    expect(await screen.findByText('P14')).toBeTruthy();

    const again = deferred<Awaited<ReturnType<typeof listTeams>>>();
    jest.mocked(listTeams).mockReturnValueOnce(again.promise);
    await pullToRefresh();

    expect(screen.getByText('P14')).toBeTruthy();
    expect(screen.queryByLabelText('Laddar')).toBeNull();
    await again.resolve([{ id: 1, name: 'P14' }]);
  });
});
