import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { listMyTeams, listTeamCoaches, listTeamPlayers } from '../api/teams';
import {
  FORBIDDEN_TEXT,
  forbiddenError,
  makeNavigation,
  makeUser,
} from '../components/teams/testData';
import { pullToRefresh } from '../test/pullToRefresh';
import SquadScreen from './SquadScreen';

jest.mock('../api/teams');
// Outside a navigator, run the focus effect like a normal effect.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

type Props = ComponentProps<typeof SquadScreen>;

const coach = makeUser({
  id: 1,
  name: 'Johan Berg',
  roleName: 'COACH',
  mobilePhoneNumber: '070-111 22 33',
  email: 'johan@fc.se',
});
const player = makeUser({
  id: 10,
  name: 'Elsa Ek',
  playerNumber: 7,
  mobilePhoneNumber: '070-555 66 77',
  parentName: 'Anna Ek',
  parentMobilePhoneNumber: '070-999 88 77',
  parentEmail: 'anna@ek.se',
});

async function renderSquad() {
  const navigation = makeNavigation();
  const props = { navigation, route: { key: 'Squad', name: 'Squad' } } as unknown as Props;
  await render(<SquadScreen {...props} />);
  return navigation;
}

describe('SquadScreen', () => {
  beforeEach(() => {
    jest.mocked(listTeamCoaches).mockResolvedValue([coach]);
    jest.mocked(listTeamPlayers).mockResolvedValue([player]);
  });

  test('shows only the coach own teams, with coaches and players', async () => {
    jest.mocked(listMyTeams).mockResolvedValue([
      { id: 5, name: 'P14' },
      { id: 6, name: 'F12' },
    ]);
    await renderSquad();

    expect(await screen.findByText('Elsa Ek')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'P14' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'F12' })).toBeTruthy();
    expect(screen.getByText('Johan Berg')).toBeTruthy();
    expect(screen.getByText('070-111 22 33')).toBeTruthy();
    expect(screen.getByText('johan@fc.se')).toBeTruthy();
    expect(screen.getByText('Spelare (1)')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Anna Ek · 070-999 88 77 · anna@ek.se')).toBeTruthy();
    expect(listTeamPlayers).toHaveBeenCalledWith(5);

    await fireEvent.press(screen.getByRole('radio', { name: 'F12' }));
    expect(listTeamPlayers).toHaveBeenCalledWith(6);
  });

  test('has no coach buttons for a coach', async () => {
    jest.mocked(listMyTeams).mockResolvedValue([{ id: 5, name: 'P14' }]);
    await renderSquad();

    await screen.findByText('Elsa Ek');
    expect(screen.queryByText('Lägg till tränare')).toBeNull();
    expect(screen.queryByText('Ta bort')).toBeNull();
  });

  test('opens the player view and Ny spelare', async () => {
    jest.mocked(listMyTeams).mockResolvedValue([{ id: 5, name: 'P14' }]);
    const navigation = await renderSquad();

    await fireEvent.press(await screen.findByTestId('player-10'));
    expect(navigation.navigate).toHaveBeenCalledWith('PlayerView', { userId: 10 });

    await fireEvent.press(screen.getByRole('button', { name: 'Ny spelare' }));
    expect(navigation.navigate).toHaveBeenCalledWith('NewPlayer', { teamId: 5 });
  });

  test('pulling the list down loads the players again and keeps the chosen team', async () => {
    jest.mocked(listMyTeams).mockResolvedValue([
      { id: 5, name: 'P14' },
      { id: 6, name: 'F12' },
    ]);
    await renderSquad();
    await screen.findByText('Elsa Ek');
    await fireEvent.press(screen.getByRole('radio', { name: 'F12' }));

    jest.mocked(listTeamPlayers).mockResolvedValue([makeUser({ id: 11, name: 'Leo Ek' })]);
    await pullToRefresh();

    expect(await screen.findByText('Leo Ek')).toBeTruthy();
    expect(listMyTeams).toHaveBeenCalledTimes(2);
    expect(listTeamPlayers).toHaveBeenLastCalledWith(6);
  });

  test('shows the Swedish message on 403', async () => {
    jest.mocked(listMyTeams).mockResolvedValue([{ id: 5, name: 'P14' }]);
    jest.mocked(listTeamPlayers).mockRejectedValue(await forbiddenError());
    await renderSquad();

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
  });
});
