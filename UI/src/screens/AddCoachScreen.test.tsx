import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { addTeamCoach, listTeamCoaches } from '../api/teams';
import { listUsers } from '../api/users';
import {
  FORBIDDEN_TEXT,
  forbiddenError,
  makeNavigation,
  makeUser,
} from '../components/teams/testData';
import AddCoachScreen from './AddCoachScreen';

jest.mock('../api/teams');
jest.mock('../api/users');

type Props = ComponentProps<typeof AddCoachScreen>;

const inTeam = makeUser({ id: 3, name: 'Johan Berg', roleName: 'COACH' });
const free = makeUser({ id: 4, name: 'Sara Nilsson', roleName: 'COACH', email: 'sara@fc.se' });
const other = makeUser({ id: 5, name: 'Karin Holm', roleName: 'COACH', email: 'karin@fc.se' });
const inactive = makeUser({ id: 6, name: 'Per Gammal', roleName: 'COACH', active: false });
const player = makeUser({ id: 10, name: 'Elsa Ek' });

async function renderAddCoach() {
  const navigation = makeNavigation();
  const props = {
    navigation,
    route: { key: 'AddCoach', name: 'AddCoach', params: { teamId: 1 } },
  } as unknown as Props;
  await render(<AddCoachScreen {...props} />);
  return navigation;
}

describe('AddCoachScreen', () => {
  beforeEach(() => {
    jest.mocked(listTeamCoaches).mockResolvedValue([inTeam]);
  });

  test('lists active coaches not in the team, searchable, with email', async () => {
    jest.mocked(listUsers).mockResolvedValue([inTeam, free, other, inactive, player]);
    await renderAddCoach();

    expect(await screen.findByText('Sara Nilsson')).toBeTruthy();
    expect(screen.getByText('sara@fc.se')).toBeTruthy();
    expect(screen.getByText('Karin Holm')).toBeTruthy();
    expect(screen.queryByText('Johan Berg')).toBeNull();
    expect(screen.queryByText('Per Gammal')).toBeNull();
    expect(screen.queryByText('Elsa Ek')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Sök'), 'sara');
    expect(screen.getByText('Sara Nilsson')).toBeTruthy();
    expect(screen.queryByText('Karin Holm')).toBeNull();
  });

  test('a tap adds the coach and goes back', async () => {
    jest.mocked(listUsers).mockResolvedValue([free]);
    jest.mocked(addTeamCoach).mockResolvedValue(free);
    const navigation = await renderAddCoach();

    await fireEvent.press(await screen.findByText('Sara Nilsson'));

    expect(addTeamCoach).toHaveBeenCalledWith(1, 4);
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('shows the empty text when nobody can be added', async () => {
    jest.mocked(listUsers).mockResolvedValue([inTeam, player]);
    await renderAddCoach();

    expect(await screen.findByText('Inga tränare att lägga till')).toBeTruthy();
  });

  test('shows the Swedish message on 403', async () => {
    jest.mocked(listUsers).mockResolvedValue([free]);
    jest.mocked(addTeamCoach).mockRejectedValue(await forbiddenError());
    const navigation = await renderAddCoach();

    await fireEvent.press(await screen.findByText('Sara Nilsson'));

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
