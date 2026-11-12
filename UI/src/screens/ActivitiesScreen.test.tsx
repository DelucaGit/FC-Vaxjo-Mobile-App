import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { listMatchAttendance, listMatches } from '../api/matches';
import { listMyTeams, listTeams } from '../api/teams';
import { listTrainingAttendance, listTrainings } from '../api/trainings';
import ActivitiesScreen from './ActivitiesScreen';

jest.mock('../api/teams', () => ({ listTeams: jest.fn(), listMyTeams: jest.fn() }));
jest.mock('../api/trainings', () => ({
  listTrainings: jest.fn(),
  listTrainingAttendance: jest.fn(),
}));
jest.mock('../api/matches', () => ({ listMatches: jest.fn(), listMatchAttendance: jest.fn() }));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

// Outside a navigator, run the focus effect like a normal effect.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = { navigation, route: { key: 'a', name: 'Activities' } } as unknown as Parameters<
  typeof ActivitiesScreen
>[0];

const training = {
  id: 1,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2020-11-10T17:30:00',
  endsAt: '2020-11-10T19:00:00',
  type: 'FOOTBALL',
  venue: 'Konstgräset',
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

beforeEach(() => {
  mockRole = 'COACH';
  jest.mocked(listMyTeams).mockResolvedValue([{ id: 10, name: 'P2014' }]);
  jest.mocked(listTeams).mockResolvedValue([
    { id: 10, name: 'P2014' },
    { id: 20, name: 'F2015' },
  ]);
  jest.mocked(listTrainings).mockResolvedValue([]);
  jest.mocked(listMatches).mockResolvedValue([]);
  jest.mocked(listTrainingAttendance).mockResolvedValue([]);
  jest.mocked(listMatchAttendance).mockResolvedValue([]);
});

test('lists trainings and matches per week with their status', async () => {
  jest.mocked(listTrainings).mockResolvedValue([
    training as never,
    {
      ...training,
      id: 2,
      type: 'FITNESS',
      startsAt: '2020-11-11T17:30:00',
      endsAt: '2020-11-11T19:00:00',
      status: 'CANCELLED',
      cancelReason: 'Snö',
    } as never,
  ]);
  jest.mocked(listMatches).mockResolvedValue([
    {
      id: 1,
      teamId: 10,
      teamName: 'P2014',
      opponent: 'Östers IF',
      kickoffAt: '2020-11-21T10:00:00',
      venue: 'Värendsvallen',
      homeAway: 'AWAY',
      result: { goalsFor: 3, goalsAgainst: 1 },
      createdByUserId: 1,
      attendanceLockedAt: '2020-11-21T19:05:00',
    },
    {
      id: 2,
      teamId: 10,
      teamName: 'P2014',
      opponent: 'IFK Värnamo',
      kickoffAt: '2020-11-22T10:00:00',
      venue: 'Värendsvallen',
      homeAway: 'HOME',
      result: null,
      status: 'CANCELLED',
      cancelReason: 'Regn',
      createdByUserId: 1,
      attendanceLockedAt: null,
    },
  ]);
  jest.mocked(listTrainingAttendance).mockResolvedValue([
    { playerUserId: 1, playerName: 'A', playerNumber: 7, status: 'PRESENT' },
    { playerUserId: 2, playerName: 'B', playerNumber: 8, status: null },
    { playerUserId: 3, playerName: 'C', playerNumber: 9, status: null },
  ]);

  await render(<ActivitiesScreen {...props} />);

  expect(await screen.findByText('2 ej markerade')).toBeTruthy();
  expect(screen.getByText('Vecka 46')).toBeTruthy();
  expect(screen.getByText('Vecka 47')).toBeTruthy();
  expect(screen.getByText('P2014')).toBeTruthy();

  const cancelled = screen.getByTestId('activity-training-2');
  expect(within(cancelled).getByText('Inställd · Snö')).toBeTruthy();
  expect(within(cancelled).getByText('Fysträning')).toHaveStyle({ textDecorationLine: 'line-through' });

  const matchRow = screen.getByTestId('activity-match-1');
  expect(within(matchRow).getByText('Match mot Östers IF')).toBeTruthy();
  expect(within(matchRow).getByText('3–1')).toBeTruthy();
  expect(within(matchRow).getByText('Värendsvallen · Borta')).toBeTruthy();
  expect(within(matchRow).getByText('Närvaro låst')).toBeTruthy();

  const cancelledMatch = screen.getByTestId('activity-match-2');
  expect(within(cancelledMatch).getByText('Inställd · Regn')).toBeTruthy();
  expect(within(cancelledMatch).getByText('Match mot IFK Värnamo')).toHaveStyle({
    textDecorationLine: 'line-through',
  });

  // Only the started, open, active training needs an attendance call.
  expect(listTrainingAttendance).toHaveBeenCalledTimes(1);
  expect(listTrainingAttendance).toHaveBeenCalledWith(1);
  expect(listMatchAttendance).not.toHaveBeenCalled();

  await fireEvent.press(matchRow);
  expect(navigation.navigate).toHaveBeenCalledWith('ActivityDetail', { kind: 'match', id: 1 });
  expect(screen.queryByText('Ny träning')).toBeNull();
});

describe('the plus button', () => {
  const openMenu = async () => {
    await render(<ActivitiesScreen {...props} />);
    await screen.findByText('Inga aktiviteter');
    await fireEvent.press(screen.getByRole('button', { name: 'Lägg till aktivitet' }));
  };

  test('is closed at first and shows the three choices on a tap', async () => {
    await render(<ActivitiesScreen {...props} />);
    await screen.findByText('Inga aktiviteter');
    expect(screen.queryByText('Lägg till fotbollsträning')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Lägg till aktivitet' }));
    expect(screen.getByText('Lägg till fotbollsträning')).toBeTruthy();
    expect(screen.getByText('Lägg till fysträning')).toBeTruthy();
    expect(screen.getByText('Ny match')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stäng' })).toBeTruthy();
  });

  test.each([
    ['Lägg till fotbollsträning', 'NewTraining', { teamId: 10, type: 'FOOTBALL' }],
    ['Lägg till fysträning', 'NewTraining', { teamId: 10, type: 'FITNESS' }],
    ['Ny match', 'NewMatch', { teamId: 10 }],
  ])('"%s" opens %s and closes the menu', async (label, route, params) => {
    await openMenu();
    await fireEvent.press(screen.getByText(label));
    expect(navigation.navigate).toHaveBeenCalledWith(route, params);
    expect(screen.queryByText(label)).toBeNull();
    expect(screen.getByRole('button', { name: 'Lägg till aktivitet' })).toBeTruthy();
  });

  test('the × closes the menu', async () => {
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Stäng' }));
    expect(screen.queryByText('Ny match')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('a tap on the dark area closes the menu', async () => {
    await openMenu();
    await fireEvent.press(screen.getByTestId('fab-backdrop'));
    expect(screen.queryByText('Ny match')).toBeNull();
  });

  test('is missing when there is no team to create for', async () => {
    jest.mocked(listMyTeams).mockResolvedValue([]);
    await render(<ActivitiesScreen {...props} />);
    await screen.findByText('Inga lag');
    expect(screen.queryByRole('button', { name: 'Lägg till aktivitet' })).toBeNull();
  });
});

test('a chairman picks among all teams', async () => {
  mockRole = 'CHAIRMAN';
  await render(<ActivitiesScreen {...props} />);

  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();
  expect(listMyTeams).not.toHaveBeenCalled();
  expect(listTrainings).toHaveBeenLastCalledWith(10, 'upcoming');

  await fireEvent.press(screen.getByRole('radio', { name: 'F2015' }));
  await screen.findByText('Inga aktiviteter');
  expect(listTrainings).toHaveBeenLastCalledWith(20, 'upcoming');
  expect(listMatches).toHaveBeenLastCalledWith(20, 'upcoming');
});

test('shows the error message from the API', async () => {
  jest.mocked(listTrainings).mockRejectedValue(
    new Error('Den här funktionen är inte tillgänglig för din roll än.'),
  );
  await render(<ActivitiesScreen {...props} />);
  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});

test('asks only for upcoming activities and does not show past ones', async () => {
  // The fake API answers like the real one: `upcoming` leaves out what has already been.
  const coming = {
    ...training,
    id: 2,
    startsAt: '2099-01-05T17:30:00',
    endsAt: '2099-01-05T19:00:00',
    type: 'FITNESS',
  };
  jest
    .mocked(listTrainings)
    .mockImplementation(
      async (_teamId, when) => (when === 'upcoming' ? [coming] : [training, coming]) as never,
    );

  await render(<ActivitiesScreen {...props} />);

  expect(await screen.findByText('Fysträning')).toBeTruthy();
  expect(screen.queryByText('Fotbollsträning')).toBeNull();
  expect(listTrainings).toHaveBeenCalledWith(10, 'upcoming');
  expect(listMatches).toHaveBeenCalledWith(10, 'upcoming');
  // The schedule keeps its plus button ("Tidigare aktiviteter" has none).
  expect(screen.getByRole('button', { name: 'Lägg till aktivitet' })).toBeTruthy();
});
