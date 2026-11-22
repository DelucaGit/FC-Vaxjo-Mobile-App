import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { MyChild, MyMatch, MyTraining } from '../api/my';
import { listMyChildren, listMyMatches, listMyTrainings } from '../api/my';
import { pullToRefresh } from '../test/pullToRefresh';
import ScheduleScreen from './ScheduleScreen';

const mockSession = { roleName: 'PLAYER', userId: 7 };

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

jest.mock('../api/my', () => ({
  listMyChildren: jest.fn(),
  listMyTrainings: jest.fn(),
  listMyMatches: jest.fn(),
}));

const mockChildren = listMyChildren as jest.MockedFunction<typeof listMyChildren>;
const mockTrainings = listMyTrainings as jest.MockedFunction<typeof listMyTrainings>;
const mockMatches = listMyMatches as jest.MockedFunction<typeof listMyMatches>;

function training(overrides: Partial<MyTraining>): MyTraining {
  return {
    id: 1,
    teamId: 1,
    teamName: 'P12 Alfa',
    startsAt: '2026-11-24T17:30:00',
    endsAt: '2026-11-24T19:00:00',
    type: 'FOOTBALL',
    venue: 'Värendsvallen',
    playerUserId: 7,
    playerName: 'Elsa Lind',
    status: null,
    trainingStatus: 'SCHEDULED',
    cancelReason: null,
    attendanceLockedAt: null,
    ...overrides,
  };
}

function match(overrides: Partial<MyMatch>): MyMatch {
  return {
    id: 1,
    teamId: 1,
    teamName: 'P12 Alfa',
    opponent: 'Östers IF',
    kickoffAt: '2026-11-28T10:00:00',
    venue: 'Värendsvallen',
    homeAway: 'HOME',
    result: null,
    attendanceLockedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.roleName = 'PLAYER';
  // "Now" is Sunday 22 Nov 2026, 12:00. Timers still run, only the clock is fixed.
  jest.useFakeTimers({ now: new Date(2026, 10, 22, 12, 0), advanceTimers: true });
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows the soonest activity as Nästa aktivitet with day, time, venue and type', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 2, startsAt: '2026-11-26T17:30:00', endsAt: '2026-11-26T19:00:00', type: 'FITNESS' }),
    training({ id: 1 }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  const next = await screen.findByTestId('next-t1');
  expect(within(next).getByText('Nästa aktivitet')).toBeTruthy();
  expect(within(next).getByText('Fotbollsträning')).toBeTruthy();
  expect(within(next).getByText('Tis 24 nov · 17:30–19:00')).toBeTruthy();
  expect(within(next).getByText('Värendsvallen')).toBeTruthy();
  // A player sends no childId and asks only for upcoming activities.
  expect(mockTrainings).toHaveBeenCalledWith(undefined, 'upcoming');
  expect(mockMatches).toHaveBeenCalledWith(undefined, 'upcoming');
  expect(mockChildren).not.toHaveBeenCalled();
});

test('a match as next activity shows the opponent and home or away', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([match({ id: 3, kickoffAt: '2026-11-23T10:00:00', homeAway: 'AWAY' })]);

  await render(<ScheduleScreen />);

  const next = await screen.findByTestId('next-m3');
  expect(within(next).getByText('Match mot Östers IF')).toBeTruthy();
  expect(within(next).getByText('Mån 23 nov · 10:00')).toBeTruthy();
  expect(within(next).getByText('Värendsvallen · Borta')).toBeTruthy();
});

test('Kommande vecka lists the seven days after the next activity, soonest first', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1 }),
    training({ id: 2, startsAt: '2026-11-26T17:30:00', endsAt: '2026-11-26T19:00:00', type: 'FITNESS' }),
    // More than seven days after the next one: not in the coming week.
    training({ id: 4, startsAt: '2026-12-02T17:30:00', endsAt: '2026-12-02T19:00:00' }),
  ]);
  mockMatches.mockResolvedValue([match({ id: 3 })]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Kommande vecka')).toBeTruthy();
  const titles = screen.getAllByTestId(/^activity-/).map((n) => n.props.testID);
  expect(titles).toEqual(['activity-t2', 'activity-m3']);
  expect(within(screen.getByTestId('activity-t2')).getByText('Fysträning')).toBeTruthy();
  expect(within(screen.getByTestId('activity-m3')).getByText('10:00 · Värendsvallen · Hemma')).toBeTruthy();
});

test('"Visa fler" adds seven more days and disappears when nothing more is planned', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1 }),
    training({ id: 2, startsAt: '2026-11-30T17:30:00', endsAt: '2026-11-30T19:00:00' }),
    training({ id: 3, startsAt: '2026-12-05T10:00:00', endsAt: '2026-12-05T11:30:00' }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByTestId('activity-t2')).toBeTruthy();
  expect(screen.queryByTestId('activity-t3')).toBeNull();

  await fireEvent.press(screen.getByText('Visa fler'));

  expect(await screen.findByTestId('activity-t3')).toBeTruthy();
  expect(screen.getByText('Kommande aktiviteter')).toBeTruthy();
  expect(screen.queryByText('Visa fler')).toBeNull();
});

test('a cancelled activity shows Inställd and its reason', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1, trainingStatus: 'CANCELLED', cancelReason: 'Snö på planen' }),
  ]);
  mockMatches.mockResolvedValue([match({ id: 3, status: 'CANCELLED', cancelReason: 'Regn' })]);

  await render(<ScheduleScreen />);

  const next = await screen.findByTestId('next-t1');
  expect(within(next).getByText('Inställd · Snö på planen')).toBeTruthy();
  expect(within(next).getByText('Fotbollsträning')).toHaveStyle({ textDecorationLine: 'line-through' });
  const row = screen.getByTestId('activity-m3');
  expect(within(row).getByText('Inställd · Regn')).toBeTruthy();
});

test('has no "Kommer / Kan inte" control and no own attendance status', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1, status: 'PRESENT' }),
    training({ id: 2, startsAt: '2026-11-26T17:30:00', endsAt: '2026-11-26T19:00:00', status: 'EXCUSED' }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  await screen.findByTestId('next-t1');
  expect(screen.queryByText(/Kommer|Kan inte/)).toBeNull();
  expect(screen.queryByText(/Närvarande|Frånvarande|Ursäktad|Ledig/)).toBeNull();
});

test('shows a clear message when nothing is upcoming', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
  expect(screen.queryByText('Nästa aktivitet')).toBeNull();
});

test('pulling the page down loads the schedule again', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);
  await render(<ScheduleScreen />);
  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();

  mockMatches.mockResolvedValue([match({ id: 3 })]);
  await pullToRefresh();

  expect(await screen.findByText('Match mot Östers IF')).toBeTruthy();
  expect(mockMatches).toHaveBeenCalledTimes(2);
});

test('a failed refresh shows the Swedish error message', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);
  await render(<ScheduleScreen />);
  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();

  mockTrainings.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));
  await pullToRefresh();

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
});

test('a parent with two children switches child and the page follows', async () => {
  mockSession.roleName = 'PARENT';
  const children: MyChild[] = [
    { id: 11, name: 'Elsa Lind', teamId: 1, teamName: 'P12 Alfa' },
    { id: 12, name: 'Noah Lind', teamId: 2, teamName: 'P14 Beta' },
  ];
  mockChildren.mockResolvedValue(children);
  mockTrainings.mockImplementation(async (childId) => [
    training({ id: childId ?? 0, type: childId === 12 ? 'FITNESS' : 'FOOTBALL' }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Nästa aktivitet för Elsa')).toBeTruthy();
  expect(screen.getByText('Fotbollsträning')).toBeTruthy();
  expect(mockTrainings).toHaveBeenCalledWith(11, 'upcoming');
  expect(mockMatches).toHaveBeenCalledWith(11, 'upcoming');

  await fireEvent.press(screen.getByText('Noah'));

  expect(await screen.findByText('Fysträning')).toBeTruthy();
  expect(screen.getByText('Nästa aktivitet för Noah')).toBeTruthy();
  expect(mockTrainings).toHaveBeenLastCalledWith(12, 'upcoming');
  expect(mockMatches).toHaveBeenLastCalledWith(12, 'upcoming');
});

test('a parent with one child sees no picker', async () => {
  mockSession.roleName = 'PARENT';
  mockChildren.mockResolvedValue([{ id: 11, name: 'Elsa Lind', teamId: 1, teamName: 'P12 Alfa' }]);
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
  expect(screen.queryByText('Elsa')).toBeNull();
  expect(mockTrainings).toHaveBeenCalledWith(11, 'upcoming');
});

test('a parent without children sees the empty message and no schedule call', async () => {
  mockSession.roleName = 'PARENT';
  mockChildren.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
  expect(mockTrainings).not.toHaveBeenCalled();
});

test('shows the Swedish error message from the API', async () => {
  mockTrainings.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
  expect(screen.queryByText('Inga kommande aktiviteter')).toBeNull();
});
