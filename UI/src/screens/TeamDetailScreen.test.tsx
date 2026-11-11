import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getTeam, listTeamCoaches, listTeamPlayers, removeTeamCoach } from '../api/teams';
import {
  FORBIDDEN_TEXT,
  forbiddenError,
  makeNavigation,
  makeUser,
} from '../components/teams/testData';
import TeamDetailScreen from './TeamDetailScreen';

jest.mock('../api/teams');
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

type Props = ComponentProps<typeof TeamDetailScreen>;

const coach = makeUser({ id: 3, name: 'Johan Berg', roleName: 'COACH' });
const player = makeUser({ id: 10, name: 'Elsa Ek', playerNumber: 7 });

async function renderDetail() {
  const navigation = makeNavigation();
  const props = {
    navigation,
    route: { key: 'TeamDetail', name: 'TeamDetail', params: { teamId: 1 } },
  } as unknown as Props;
  await render(<TeamDetailScreen {...props} />);
  return navigation;
}

describe('TeamDetailScreen', () => {
  beforeEach(() => {
    jest.mocked(getTeam).mockResolvedValue({ id: 1, name: 'P14' });
    jest.mocked(listTeamCoaches).mockResolvedValue([coach]);
    jest.mocked(listTeamPlayers).mockResolvedValue([player]);
  });

  test('shows the team with its coaches and players', async () => {
    const navigation = await renderDetail();

    expect(await screen.findByText('P14')).toBeTruthy();
    expect(screen.getByText('Johan Berg')).toBeTruthy();
    expect(screen.getByText('Spelare (1)')).toBeTruthy();

    await fireEvent.press(screen.getByText('Lägg till tränare'));
    expect(navigation.navigate).toHaveBeenCalledWith('AddCoach', { teamId: 1 });

    await fireEvent.press(screen.getByTestId('player-10'));
    expect(navigation.navigate).toHaveBeenCalledWith('PlayerProfile', { userId: 10 });

    await fireEvent.press(screen.getByRole('button', { name: 'Ny spelare' }));
    expect(navigation.navigate).toHaveBeenCalledWith('NewPlayer', { teamId: 1 });
  });

  test('removes a coach after the confirm dialog', async () => {
    jest.mocked(removeTeamCoach).mockResolvedValue();
    await renderDetail();

    await fireEvent.press(await screen.findByRole('button', { name: 'Ta bort' }));
    expect(screen.getByText('Ta bort Johan Berg från laget?')).toBeTruthy();
    expect(removeTeamCoach).not.toHaveBeenCalled();

    jest.mocked(listTeamCoaches).mockResolvedValue([]);
    // The confirm button is the second "Ta bort" (the row link is the first).
    const buttons = screen.getAllByRole('button', { name: 'Ta bort' });
    await fireEvent.press(buttons[buttons.length - 1]);

    expect(removeTeamCoach).toHaveBeenCalledWith(1, 3);
    expect(await screen.findByText('Inga tränare')).toBeTruthy();
  });

  test('cancel keeps the coach', async () => {
    await renderDetail();

    await fireEvent.press(await screen.findByRole('button', { name: 'Ta bort' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Avbryt' }));

    expect(removeTeamCoach).not.toHaveBeenCalled();
    expect(screen.getByText('Johan Berg')).toBeTruthy();
  });

  test('shows the Swedish message when removing is forbidden', async () => {
    jest.mocked(removeTeamCoach).mockRejectedValue(await forbiddenError());
    await renderDetail();

    await fireEvent.press(await screen.findByRole('button', { name: 'Ta bort' }));
    const buttons = screen.getAllByRole('button', { name: 'Ta bort' });
    await fireEvent.press(buttons[buttons.length - 1]);

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
  });
});
