import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { readErrorMessage } from '../api/http';
import { listMyTeams, listTeams } from '../api/teams';
import { createUser, listUsers, type ClubUser } from '../api/users';
import NewUserScreen from './NewUserScreen';

jest.mock('../api/teams', () => ({
  listTeams: jest.fn(),
  listMyTeams: jest.fn(),
  listTeamPlayers: jest.fn(),
}));
jest.mock('../api/users', () => ({
  createUser: jest.fn(),
  listUsers: jest.fn(),
}));

// The first render loads many modules; on a busy machine that can pass 5 s.
jest.setTimeout(20000);

let mockRole = 'CHAIRMAN';
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

async function renderScreen() {
  const props = {
    navigation: { goBack },
    route: { key: 'NewUser', name: 'NewUser', params: undefined },
  } as unknown as ComponentProps<typeof NewUserScreen>;
  await render(<NewUserScreen {...props} />);
  // Wait until teams and parents have loaded.
  await screen.findByLabelText('Namn');
}

async function fillBase(name = 'Ida Ek') {
  await fireEvent.changeText(screen.getByLabelText('Namn'), name);
  await fireEvent.changeText(screen.getByLabelText('E-post'), 'ida@example.com');
}

/** ADMIN has five roles, so Roll is a dropdown. */
async function pickRoleFromList(label: string) {
  await fireEvent.press(screen.getByRole('button', { name: 'Roll' }));
  await fireEvent.press(screen.getByText(label));
}

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

describe('NewUserScreen', () => {
  beforeEach(() => {
    mockRole = 'CHAIRMAN';
    goBack.mockClear();
    (createUser as jest.Mock).mockReset();
    (listTeams as jest.Mock).mockResolvedValue([
      { id: 1, name: 'P12 Alfa' },
      { id: 2, name: 'P12 Beta' },
    ]);
    (listUsers as jest.Mock).mockResolvedValue([
      user({ id: 20, name: 'Anna Lind', roleName: 'PARENT' }),
    ]);
  });

  test('chairman sees only Spelare, Förälder and Tränare as segments', async () => {
    await renderScreen();

    expect(screen.getByRole('radio', { name: 'Spelare' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Förälder' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tränare' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByText('Admin')).toBeNull();
    expect(screen.queryByText('Ordförande')).toBeNull();
    expect(listMyTeams).not.toHaveBeenCalled();
  });

  test('a player without a parent cannot be saved', async () => {
    await renderScreen();
    await fillBase();
    await fireEvent.press(screen.getByRole('radio', { name: 'Spelare' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lag' }));
    await fireEvent.press(screen.getByText('P12 Beta'));

    expect(saveButton()).toBeDisabled();

    await fireEvent.press(screen.getByTestId('parent-20'));
    expect(saveButton()).toBeEnabled();
  });

  test('chairman creates a player with team, shirt number and a new parent', async () => {
    (createUser as jest.Mock).mockResolvedValue(
      user({
        id: 50,
        name: 'Ida Ek',
        parentName: 'Eva Ek',
        temporaryPassword: fakePassword('1234'),
        parentTemporaryPassword: fakePassword('5678'),
      }),
    );
    await renderScreen();
    await fillBase();
    await fireEvent.press(screen.getByRole('radio', { name: 'Spelare' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lag' }));
    await fireEvent.press(screen.getByText('P12 Alfa'));
    await fireEvent.changeText(screen.getByLabelText('Tröjnummer (valfritt)'), '9');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skapa ny' }));
    await fireEvent.changeText(screen.getByLabelText('Förälderns namn'), 'Eva Ek');
    await fireEvent.changeText(screen.getByLabelText('Förälderns e-post'), 'eva@example.com');
    await fireEvent.changeText(screen.getByLabelText('Förälderns telefon'), '0701234567');

    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith({
      name: 'Ida Ek',
      email: 'ida@example.com',
      roleName: 'PLAYER',
      mobilePhoneNumber: null,
      playerNumber: 9,
      teamId: 1,
      newParent: { name: 'Eva Ek', email: 'eva@example.com', mobilePhoneNumber: '0701234567' },
    });
    expect(await screen.findByText('Konto skapat')).toBeTruthy();
    expect(screen.getByText('Tillfälligt lösenord: Tmp-1234')).toBeTruthy();
    expect(screen.getByText('Eva Ek')).toBeTruthy();
    expect(screen.getByText('Tillfälligt lösenord: Tmp-5678')).toBeTruthy();
  });

  test('a coach gets no team or parent fields, and the password is shown after create', async () => {
    (createUser as jest.Mock).mockResolvedValue(
      user({ id: 51, name: 'Kalle Coach', roleName: 'COACH', temporaryPassword: fakePassword('9999') }),
    );
    await renderScreen();
    await fillBase('Kalle Coach');
    await fireEvent.changeText(screen.getByLabelText('Telefon (valfri)'), '0709876543');
    await fireEvent.press(screen.getByRole('radio', { name: 'Tränare' }));

    expect(screen.queryByRole('button', { name: 'Lag' })).toBeNull();
    expect(screen.queryByLabelText('Tröjnummer (valfritt)')).toBeNull();
    expect(screen.queryByText('Anna Lind')).toBeNull();
    expect(saveButton()).toBeEnabled();

    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith({
      name: 'Kalle Coach',
      email: 'ida@example.com',
      roleName: 'COACH',
      mobilePhoneNumber: '0709876543',
    });
    expect(await screen.findByText('Konto skapat')).toBeTruthy();
    expect(screen.getByText('Kalle Coach')).toBeTruthy();
    expect(screen.getByText('Tillfälligt lösenord: Tmp-9999')).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Klar' }));
    expect(goBack).toHaveBeenCalled();
  });

  test('a parent needs only the base fields', async () => {
    (createUser as jest.Mock).mockResolvedValue(
      user({ id: 52, name: 'Eva Ek', roleName: 'PARENT', temporaryPassword: fakePassword('1111') }),
    );
    await renderScreen();
    expect(saveButton()).toBeDisabled();
    await fillBase('Eva Ek');
    expect(saveButton()).toBeDisabled(); // no role yet
    await fireEvent.press(screen.getByRole('radio', { name: 'Förälder' }));

    expect(screen.queryByRole('button', { name: 'Lag' })).toBeNull();
    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith({
      name: 'Eva Ek',
      email: 'ida@example.com',
      roleName: 'PARENT',
      mobilePhoneNumber: null,
    });
    expect(await screen.findByText('Tillfälligt lösenord: Tmp-1111')).toBeTruthy();
  });

  test('admin picks from all five roles in a dropdown and creates a chairman', async () => {
    mockRole = 'ADMIN';
    (createUser as jest.Mock).mockResolvedValue(
      user({ id: 53, name: 'Olle Ordf', roleName: 'CHAIRMAN', temporaryPassword: fakePassword('2222') }),
    );
    await renderScreen();

    expect(screen.queryByRole('radio', { name: 'Spelare' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Roll' }));
    for (const label of ['Admin', 'Ordförande', 'Tränare', 'Spelare', 'Förälder']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    await fireEvent.press(screen.getByText('Ordförande'));

    await fillBase('Olle Ordf');
    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith({
      name: 'Olle Ordf',
      email: 'ida@example.com',
      roleName: 'CHAIRMAN',
      mobilePhoneNumber: null,
    });
    expect(await screen.findByText('Tillfälligt lösenord: Tmp-2222')).toBeTruthy();
  });

  test('admin can also create an admin', async () => {
    mockRole = 'ADMIN';
    (createUser as jest.Mock).mockResolvedValue(
      user({ id: 54, name: 'Ada Admin', roleName: 'ADMIN', temporaryPassword: fakePassword('3333') }),
    );
    await renderScreen();
    await fillBase('Ada Admin');
    await pickRoleFromList('Admin');
    await fireEvent.press(saveButton());

    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ roleName: 'ADMIN' }));
    expect(await screen.findByText('Tillfälligt lösenord: Tmp-3333')).toBeTruthy();
  });

  test('a 403 shows the Swedish message and stays on the form', async () => {
    const message = await readErrorMessage(new Response('Access Denied', { status: 403 }));
    (createUser as jest.Mock).mockRejectedValue(new Error(message));
    await renderScreen();
    await fillBase();
    await fireEvent.press(screen.getByRole('radio', { name: 'Förälder' }));
    await fireEvent.press(saveButton());

    expect(
      await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
    ).toBeTruthy();
    expect(screen.queryByText('Konto skapat')).toBeNull();
    expect(goBack).not.toHaveBeenCalled();
  });
});
