import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { listMyTeams, listTeams } from '../api/teams';
import { deletePlayer, getUser, updatePlayer, type ClubUser } from '../api/users';
import PlayerProfileScreen from './PlayerProfileScreen';

jest.mock('../api/teams', () => ({
  listTeams: jest.fn(),
  listMyTeams: jest.fn(),
}));
jest.mock('../api/users', () => ({
  getUser: jest.fn(),
  updatePlayer: jest.fn(),
  deletePlayer: jest.fn(),
}));

// The first render loads many modules; on a busy machine that can pass 5 s.
jest.setTimeout(20000);

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 1, roleName: mockRole } }),
}));

const elsa: ClubUser = {
  id: 10,
  name: 'Elsa Lind',
  email: 'elsa@example.com',
  roleName: 'PLAYER',
  playerNumber: 9,
  mobilePhoneNumber: '0700000010',
  parentId: 20,
  parentName: 'Anna Lind',
  parentEmail: 'anna@example.com',
  parentMobilePhoneNumber: '0700000020',
  teamId: 1,
  teamName: 'P12 Alfa',
  active: true,
};

const goBack = jest.fn();

async function renderScreen() {
  const props = {
    navigation: { goBack },
    route: { key: 'PlayerProfile', name: 'PlayerProfile', params: { userId: 10 } },
  } as unknown as ComponentProps<typeof PlayerProfileScreen>;
  await render(<PlayerProfileScreen {...props} />);
  await screen.findByDisplayValue('Elsa Lind');
}

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

describe('PlayerProfileScreen', () => {
  beforeEach(() => {
    mockRole = 'COACH';
    (getUser as jest.Mock).mockResolvedValue(elsa);
    (listMyTeams as jest.Mock).mockResolvedValue([
      { id: 1, name: 'P12 Alfa' },
      { id: 2, name: 'P12 Beta' },
    ]);
    (listTeams as jest.Mock).mockResolvedValue([{ id: 1, name: 'P12 Alfa' }]);
    (updatePlayer as jest.Mock).mockResolvedValue(elsa);
    (deletePlayer as jest.Mock).mockResolvedValue(undefined);
  });

  test('edits the player and the parent, then goes back', async () => {
    await renderScreen();
    expect(listMyTeams).toHaveBeenCalled();
    expect(listTeams).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Telefon'), '0711111111');
    await fireEvent.changeText(screen.getByLabelText('Tröjnummer (valfritt)'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Lag' }));
    await fireEvent.press(screen.getByText('P12 Beta'));
    await fireEvent.changeText(screen.getByLabelText('Förälderns telefon'), '0722222222');
    await fireEvent.press(saveButton());

    expect(updatePlayer).toHaveBeenCalledWith(10, {
      name: 'Elsa Lind',
      email: 'elsa@example.com',
      mobilePhoneNumber: '0711111111',
      playerNumber: null,
      teamId: 2,
      parentName: 'Anna Lind',
      parentEmail: 'anna@example.com',
      parentMobilePhoneNumber: '0722222222',
    });
    expect(goBack).toHaveBeenCalled();
  });

  test('chairman gets every team', async () => {
    mockRole = 'CHAIRMAN';
    await renderScreen();
    expect(listTeams).toHaveBeenCalled();
    expect(listMyTeams).not.toHaveBeenCalled();
  });

  test('Spara is locked while Namn or E-post is empty', async () => {
    await renderScreen();
    expect(saveButton()).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText('Namn'), ' ');
    expect(saveButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Namn'), 'Elsa');
    await fireEvent.changeText(screen.getByLabelText('E-post'), '');
    expect(saveButton()).toBeDisabled();
  });

  test('a duplicate email or phone shows the Swedish message', async () => {
    (updatePlayer as jest.Mock).mockRejectedValue(new Error('Email already in use'));
    await renderScreen();

    await fireEvent.press(saveButton());

    expect(await screen.findByText('E-post eller telefon används redan')).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
  });

  test('removes the player after the confirmation', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ta bort spelare' }));
    expect(screen.getByText('Spelaren blir inaktiv. Gammal närvaro sparas.')).toBeTruthy();
    expect(deletePlayer).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Ta bort' }));

    expect(deletePlayer).toHaveBeenCalledWith(10);
    expect(goBack).toHaveBeenCalled();
  });
});
