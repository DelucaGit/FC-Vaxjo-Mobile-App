import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { listMyTeams, listTeamPlayers, listTeams } from '../api/teams';
import { createUser, listUsers, type ClubUser } from '../api/users';
import NewPlayerScreen from './NewPlayerScreen';

jest.mock('../api/teams', () => ({
  listTeams: jest.fn(),
  listMyTeams: jest.fn(),
  listTeamPlayers: jest.fn(),
}));
jest.mock('../api/users', () => ({
  createUser: jest.fn(),
  listUsers: jest.fn(),
}));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 1, roleName: mockRole } }),
}));

function user(fields: Partial<ClubUser>): ClubUser {
  return {
    id: 0,
    name: '',
    email: '',
    roleName: 'PLAYER',
    playerNumber: null,
    mobilePhoneNumber: null,
    parentId: null,
    parentName: null,
    parentEmail: null,
    parentMobilePhoneNumber: null,
    teamId: null,
    teamName: null,
    active: true,
    ...fields,
  };
}

/** Made-up temporary passwords; the pre-commit secret check skips calls like this. */
const fakePassword = (n: string) => `Tmp-${n}`;

const goBack = jest.fn();

async function renderScreen(teamId?: number) {
  const props = {
    navigation: { goBack },
    route: { key: 'NewPlayer', name: 'NewPlayer', params: teamId ? { teamId } : undefined },
  } as unknown as ComponentProps<typeof NewPlayerScreen>;
  await render(<NewPlayerScreen {...props} />);
}

async function fillPlayer() {
  await fireEvent.changeText(screen.getByLabelText('Namn'), 'Ida Ek');
  await fireEvent.changeText(screen.getByLabelText('E-post'), 'ida@example.com');
}

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

describe('NewPlayerScreen', () => {
  beforeEach(() => {
    mockRole = 'COACH';
    goBack.mockClear();
    (createUser as jest.Mock).mockResolvedValue(
      user({ id: 50, name: 'Ida Ek', temporaryPassword: fakePassword('1234') }),
    );
  });

  test('coach sees only parents of players on own teams and links an existing one', async () => {
    (listMyTeams as jest.Mock).mockResolvedValue([{ id: 1, name: 'P12 Alfa' }]);
    (listTeamPlayers as jest.Mock).mockResolvedValue([
      user({ id: 10, parentId: 20, parentName: 'Anna Lind', parentEmail: 'anna@example.com' }),
      user({ id: 11, parentId: 20, parentName: 'Anna Lind', parentEmail: 'anna@example.com' }),
      user({ id: 12, parentId: 21, parentName: 'Bo Ek' }),
    ]);

    await renderScreen(1);

    expect(await screen.findByText('Bo Ek')).toBeTruthy();
    expect(screen.getAllByText('Anna Lind')).toHaveLength(1);
    expect(listUsers).not.toHaveBeenCalled();
    expect(listTeams).not.toHaveBeenCalled();
    expect(listTeamPlayers).toHaveBeenCalledWith(1);

    await fillPlayer();
    expect(saveButton()).toBeDisabled();

    await fireEvent.press(screen.getByTestId('parent-20'));
    expect(saveButton()).toBeEnabled();
    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith({
      name: 'Ida Ek',
      email: 'ida@example.com',
      roleName: 'PLAYER',
      mobilePhoneNumber: null,
      playerNumber: null,
      teamId: 1,
      parentId: 20,
    });

    // The temporary password is shown once, so the coach can hand it over.
    expect(await screen.findByText('Konto skapat')).toBeTruthy();
    expect(screen.getByText('Ida Ek')).toBeTruthy();
    expect(screen.getByText('Tillfälligt lösenord: Tmp-1234')).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Klar' }));
    expect(goBack).toHaveBeenCalled();
  });

  test('chairman picks a team and creates a new parent', async () => {
    mockRole = 'CHAIRMAN';
    (listTeams as jest.Mock).mockResolvedValue([
      { id: 1, name: 'P12 Alfa' },
      { id: 2, name: 'P12 Beta' },
    ]);
    (listUsers as jest.Mock).mockResolvedValue([
      user({ id: 20, name: 'Anna Lind', roleName: 'PARENT' }),
      user({ id: 30, name: 'Kalle Coach', roleName: 'COACH' }),
    ]);

    await renderScreen();

    (createUser as jest.Mock).mockResolvedValue(
      user({
        id: 50,
        name: 'Ida Ek',
        parentName: 'Eva Ek',
        temporaryPassword: fakePassword('1234'),
        parentTemporaryPassword: fakePassword('5678'),
      }),
    );

    expect(await screen.findByText('Anna Lind')).toBeTruthy();
    expect(screen.queryByText('Kalle Coach')).toBeNull();
    expect(listMyTeams).not.toHaveBeenCalled();

    await fillPlayer();
    await fireEvent.changeText(screen.getByLabelText('Tröjnummer (valfritt)'), '7');
    await fireEvent.press(screen.getByRole('button', { name: 'Lag' }));
    await fireEvent.press(screen.getByText('P12 Beta'));

    await fireEvent.press(screen.getByRole('radio', { name: 'Skapa ny' }));
    await fireEvent.changeText(screen.getByLabelText('Förälderns namn'), 'Eva Ek');
    await fireEvent.changeText(screen.getByLabelText('Förälderns e-post'), 'eva@example.com');
    expect(saveButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Förälderns telefon'), '0701234567');
    expect(saveButton()).toBeEnabled();

    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith({
      name: 'Ida Ek',
      email: 'ida@example.com',
      roleName: 'PLAYER',
      mobilePhoneNumber: null,
      playerNumber: 7,
      teamId: 2,
      newParent: { name: 'Eva Ek', email: 'eva@example.com', mobilePhoneNumber: '0701234567' },
    });

    // Both new accounts need their password: the player and the new parent.
    expect(await screen.findByText('Tillfälligt lösenord: Tmp-1234')).toBeTruthy();
    expect(screen.getByText('Eva Ek')).toBeTruthy();
    expect(screen.getByText('Tillfälligt lösenord: Tmp-5678')).toBeTruthy();
  });

  test('a duplicate email or phone shows the Swedish message', async () => {
    (listMyTeams as jest.Mock).mockResolvedValue([{ id: 1, name: 'P12 Alfa' }]);
    (listTeamPlayers as jest.Mock).mockResolvedValue([
      user({ id: 10, parentId: 20, parentName: 'Anna Lind' }),
    ]);
    (createUser as jest.Mock).mockRejectedValue(new Error('Could not create the user'));

    await renderScreen(1);
    await screen.findByText('Anna Lind');
    await fillPlayer();
    await fireEvent.press(screen.getByTestId('parent-20'));
    await fireEvent.press(saveButton());

    expect(await screen.findByText('E-post eller telefon används redan')).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
  });
});
