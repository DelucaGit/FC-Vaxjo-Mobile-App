import { fireEvent, render, screen } from '@testing-library/react-native';
import { listMatchAttendance, listMatches } from '../api/matches';
import { listMyChildren, listMyMatches, listMyTrainings } from '../api/my';
import { listMyTeams, listTeams } from '../api/teams';
import { listTrainingAttendance, listTrainings } from '../api/trainings';
import PastActivitiesScreen from './PastActivitiesScreen';

jest.mock('../api/my', () => ({
  listMyChildren: jest.fn(),
  listMyTrainings: jest.fn(),
  listMyMatches: jest.fn(),
}));
jest.mock('../api/teams', () => ({ listTeams: jest.fn(), listMyTeams: jest.fn() }));
jest.mock('../api/trainings', () => ({
  listTrainings: jest.fn(),
  listTrainingAttendance: jest.fn(),
}));
jest.mock('../api/matches', () => ({ listMatches: jest.fn(), listMatchAttendance: jest.fn() }));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole, userId: 7 } }),
}));

// Outside a navigator, run the focus effect like a normal effect.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = { navigation, route: { key: 'p', name: 'PastActivities' } } as unknown as Parameters<
  typeof PastActivitiesScreen
>[0];

const training = {
  id: 1,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2026-11-03T17:30:00',
  endsAt: '2026-11-03T19:00:00',
  type: 'FITNESS' as const,
  venue: 'Konstgräset',
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: '2026-11-04T08:00:00',
};

const match = {
  id: 2,
  teamId: 10,
  teamName: 'P2014',
  opponent: 'Östers IF',
  kickoffAt: '2026-11-08T10:00:00',
  venue: 'Värendsvallen',
  homeAway: 'HOME',
  result: { goalsFor: 3, goalsAgainst: 1 },
  createdByUserId: 1,
  attendanceLockedAt: '2026-11-09T08:00:00',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'COACH';
  jest.mocked(listMyTeams).mockResolvedValue([{ id: 10, name: 'P2014' }]);
  jest.mocked(listTeams).mockResolvedValue([{ id: 10, name: 'P2014' }]);
  jest.mocked(listTrainings).mockResolvedValue([training] as never);
  jest.mocked(listMatches).mockResolvedValue([match] as never);
  jest.mocked(listTrainingAttendance).mockResolvedValue([]);
  jest.mocked(listMatchAttendance).mockResolvedValue([]);
});

test.each(['COACH', 'CHAIRMAN', 'ADMIN'])(
  '%s sees the team\'s past activities, newest first, and a tap opens the detail view',
  async (role) => {
    mockRole = role;
    await render(<PastActivitiesScreen {...props} />);

    expect(await screen.findByText('Tidigare aktiviteter')).toBeTruthy();
    await screen.findByText('Match mot Östers IF');
    expect(listTrainings).toHaveBeenCalledWith(10, 'past');
    expect(listMatches).toHaveBeenCalledWith(10, 'past');

    // Newest first: the match (8 Nov) comes before the training (3 Nov).
    const titles = screen.getAllByText(/Fysträning|Match mot/).map((n) => n.props.children);
    expect(titles).toEqual(['Match mot Östers IF', 'Fysträning']);
    expect(screen.getByText('3–1')).toBeTruthy();
    // No plus button here: this screen is for looking back.
    expect(screen.queryByRole('button', { name: 'Lägg till aktivitet' })).toBeNull();

    await fireEvent.press(screen.getByTestId('activity-training-1'));
    expect(navigation.navigate).toHaveBeenCalledWith('ActivityDetail', { kind: 'training', id: 1 });

    await fireEvent.press(screen.getByLabelText('Tillbaka'));
    expect(navigation.goBack).toHaveBeenCalled();
  },
);

test('a player sees their own past activities with their attendance and the result', async () => {
  mockRole = 'PLAYER';
  jest.mocked(listMyTrainings).mockResolvedValue([
    {
      ...training,
      playerUserId: 7,
      playerName: 'Elsa Lind',
      status: 'PRESENT',
      trainingStatus: 'SCHEDULED',
    },
  ]);
  jest.mocked(listMyMatches).mockResolvedValue([match as never]);

  await render(<PastActivitiesScreen {...props} />);

  expect(await screen.findByText('Närvarande')).toBeTruthy();
  expect(screen.getByText('3–1')).toBeTruthy();
  expect(listMyTrainings).toHaveBeenCalledWith(undefined, 'past');
  expect(listMyMatches).toHaveBeenCalledWith(undefined, 'past');
  expect(listTrainings).not.toHaveBeenCalled();
});

test('a parent sees the chosen child\'s past activities', async () => {
  mockRole = 'PARENT';
  jest.mocked(listMyChildren).mockResolvedValue([
    { id: 11, name: 'Elsa Lind', teamId: 10, teamName: 'P2014' },
  ]);
  jest.mocked(listMyTrainings).mockResolvedValue([]);
  jest.mocked(listMyMatches).mockResolvedValue([match as never]);

  await render(<PastActivitiesScreen {...props} />);

  expect(await screen.findByText('Match mot Östers IF')).toBeTruthy();
  expect(listMyTrainings).toHaveBeenCalledWith(11, 'past');
  expect(listMyMatches).toHaveBeenCalledWith(11, 'past');
});
