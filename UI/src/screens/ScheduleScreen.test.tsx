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
    startsAt: '2026-11-09T17:30:00',
    endsAt: '2026-11-09T19:00:00',
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
    kickoffAt: '2026-11-14T10:00:00',
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
  // "Now" is Tuesday 10 Nov 2026, week 46.
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-10T12:00:00').getTime());
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('groups activities under their ISO week, oldest first', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1, startsAt: '2026-11-16T17:30:00', endsAt: '2026-11-16T19:00:00', type: 'FITNESS' }),
    training({ id: 2, type: 'FOOTBALL' }),
  ]);
  mockMatches.mockResolvedValue([match({ id: 3 })]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Vecka 46')).toBeTruthy();
  expect(screen.getByText('Vecka 47')).toBeTruthy();
  const titles = screen.getAllByText(/Fotbollsträning|Match mot Östers IF|Fysträning/).map((n) => n.props.children);
  expect(titles).toEqual(['Fotbollsträning', 'Match mot Östers IF', 'Fysträning']);
  // A player sends no childId.
  expect(mockTrainings).toHaveBeenCalledWith(undefined, 'upcoming');
  expect(mockChildren).not.toHaveBeenCalled();
});

test('a past training shows the own status, a future one shows none', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1, status: 'EXCUSED' }),
    training({ id: 2, startsAt: '2026-11-08T17:30:00', endsAt: '2026-11-08T19:00:00', status: null }),
    training({ id: 3, startsAt: '2026-11-12T17:30:00', endsAt: '2026-11-12T19:00:00', status: 'PRESENT' }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  const past = await screen.findByTestId('training-1');
  expect(within(past).getByText('Ursäktad')).toBeTruthy();
  expect(within(screen.getByTestId('training-2')).getByText('–')).toBeTruthy();
  expect(within(screen.getByTestId('training-3')).queryByText('Närvarande')).toBeNull();
});

test('a cancelled training is struck through and shows the reason', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1, trainingStatus: 'CANCELLED', cancelReason: 'Snö på planen', status: 'ABSENT' }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inställd · Snö på planen')).toBeTruthy();
  const title = screen.getByText('Fotbollsträning');
  expect(title).toHaveStyle({ textDecorationLine: 'line-through' });
  // No attendance on a cancelled training.
  expect(screen.queryByText('Frånvarande')).toBeNull();
});

test('a cancelled match is struck through, shows the reason and hides the result', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([
    match({ id: 1, status: 'CANCELLED', cancelReason: 'Regn', result: { goalsFor: 2, goalsAgainst: 0 } }),
  ]);

  await render(<ScheduleScreen />);

  const row = await screen.findByTestId('match-1');
  expect(within(row).getByText('Inställd · Regn')).toBeTruthy();
  expect(within(row).getByText('Match mot Östers IF')).toHaveStyle({ textDecorationLine: 'line-through' });
  expect(within(row).queryByText('2–0')).toBeNull();
});

test('a match shows result, venue and home/away, and no attendance', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([
    match({ id: 1, kickoffAt: '2026-11-07T10:00:00', result: { goalsFor: 3, goalsAgainst: 1 }, homeAway: 'AWAY' }),
  ]);

  await render(<ScheduleScreen />);

  const row = await screen.findByTestId('match-1');
  expect(within(row).getByText('Match mot Östers IF')).toBeTruthy();
  expect(within(row).getByText('3–1')).toBeTruthy();
  expect(within(row).getByText('Värendsvallen · Borta')).toBeTruthy();
  expect(within(row).queryByText('–')).toBeNull();
});

test('shows "Inga aktiviteter" when the list is empty', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();
});

test('pulling the list down loads the schedule again', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);
  await render(<ScheduleScreen />);
  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();

  mockMatches.mockResolvedValue([match({ id: 3 })]);
  await pullToRefresh();

  expect(await screen.findByText('Match mot Östers IF')).toBeTruthy();
  expect(mockMatches).toHaveBeenCalledTimes(2);
});

test('a failed refresh shows the same Swedish error message', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);
  await render(<ScheduleScreen />);
  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();

  mockTrainings.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));
  await pullToRefresh();

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
});

test('a parent with two children picks one by first name and the schedule follows', async () => {
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

  expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
  expect(mockTrainings).toHaveBeenCalledWith(11, 'upcoming');
  expect(mockMatches).toHaveBeenCalledWith(11, 'upcoming');

  await fireEvent.press(screen.getByText('Noah'));

  expect(await screen.findByText('Fysträning')).toBeTruthy();
  expect(mockTrainings).toHaveBeenLastCalledWith(12, 'upcoming');
  expect(mockMatches).toHaveBeenLastCalledWith(12, 'upcoming');
});

test('a parent with one child sees no picker', async () => {
  mockSession.roleName = 'PARENT';
  mockChildren.mockResolvedValue([{ id: 11, name: 'Elsa Lind', teamId: 1, teamName: 'P12 Alfa' }]);
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();
  expect(screen.queryByText('Elsa')).toBeNull();
  expect(mockTrainings).toHaveBeenCalledWith(11, 'upcoming');
});

test('a parent without children sees "Inga aktiviteter" and no schedule call', async () => {
  mockSession.roleName = 'PARENT';
  mockChildren.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();
  expect(mockTrainings).not.toHaveBeenCalled();
});

test('shows the Swedish error message from the API', async () => {
  mockTrainings.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
  expect(screen.queryByText('Inga aktiviteter')).toBeNull();
});

test('asks only for upcoming activities and does not show past ones', async () => {
  // The fake API answers like the real one: `upcoming` leaves out what has already been.
  const past = training({
    id: 1,
    startsAt: '2026-11-02T17:30:00',
    endsAt: '2026-11-02T19:00:00',
    type: 'FITNESS',
  });
  const coming = training({
    id: 2,
    startsAt: '2026-11-12T17:30:00',
    endsAt: '2026-11-12T19:00:00',
    type: 'FOOTBALL',
  });
  mockTrainings.mockImplementation(async (_childId, when) =>
    when === 'upcoming' ? [coming] : [past, coming],
  );
  mockMatches.mockImplementation(async (_childId, when) =>
    when === 'upcoming' ? [] : [match({ id: 3, kickoffAt: '2026-11-01T10:00:00' })],
  );

  await render(<ScheduleScreen />);

  expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
  expect(screen.queryByText('Fysträning')).toBeNull();
  expect(screen.queryByText('Match mot Östers IF')).toBeNull();
  expect(mockTrainings).toHaveBeenCalledWith(undefined, 'upcoming');
  expect(mockMatches).toHaveBeenCalledWith(undefined, 'upcoming');
});

test('keeps the soonest activity first', async () => {
  mockTrainings.mockResolvedValue([
    training({ id: 1, startsAt: '2026-11-12T17:30:00', endsAt: '2026-11-12T19:00:00', type: 'FITNESS' }),
    training({ id: 2, startsAt: '2026-11-10T17:30:00', endsAt: '2026-11-10T19:00:00', type: 'FOOTBALL' }),
  ]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen />);

  // Tuesday's football training comes before Thursday's fitness training.
  await screen.findByText('Fotbollsträning');
  const titles = screen.getAllByText(/Fotbollsträning|Fysträning/).map((n) => n.props.children);
  expect(titles).toEqual(['Fotbollsträning', 'Fysträning']);
});
