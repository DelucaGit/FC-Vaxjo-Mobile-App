import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { MyChild, MyMatch, MyTraining } from '../api/my';
import { listMyChildren, listMyMatches, listMyTrainings } from '../api/my';
import type { LeaveRequest } from '../api/leaveRequests';
import { listMyLeaveRequests } from '../api/leaveRequests';
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

jest.mock('../api/leaveRequests', () => ({ listMyLeaveRequests: jest.fn() }));

// The start page reloads on focus; in a test "focus" is simply the first render.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
type Props = Parameters<typeof ScheduleScreen>[0];
const props = { navigation, route: { key: 's', name: 'Schedule' } } as unknown as Props;

const mockLeave = listMyLeaveRequests as jest.MockedFunction<typeof listMyLeaveRequests>;
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

function leave(overrides: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 100,
    playerUserId: 7,
    activityKind: 'TRAINING',
    activityId: 1,
    reasonType: 'SICK',
    status: 'PENDING',
    createdAt: '2026-11-21T09:00:00',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.roleName = 'PLAYER';
  mockLeave.mockResolvedValue([]);
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

  await render(<ScheduleScreen {...props} />);

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

  await render(<ScheduleScreen {...props} />);

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

  await render(<ScheduleScreen {...props} />);

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

  await render(<ScheduleScreen {...props} />);

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

  await render(<ScheduleScreen {...props} />);

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

  await render(<ScheduleScreen {...props} />);

  await screen.findByTestId('next-t1');
  expect(screen.queryByText(/Kommer|Kan inte/)).toBeNull();
  expect(screen.queryByText(/Närvarande|Frånvarande|Ursäktad|Ledig/)).toBeNull();
});

test('shows a clear message when nothing is upcoming', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen {...props} />);

  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
  expect(screen.queryByText('Nästa aktivitet')).toBeNull();
});

test('pulling the page down loads the schedule again', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);
  await render(<ScheduleScreen {...props} />);
  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();

  mockMatches.mockResolvedValue([match({ id: 3 })]);
  await pullToRefresh();

  expect(await screen.findByText('Match mot Östers IF')).toBeTruthy();
  expect(mockMatches).toHaveBeenCalledTimes(2);
});

test('a failed refresh shows the Swedish error message', async () => {
  mockTrainings.mockResolvedValue([]);
  mockMatches.mockResolvedValue([]);
  await render(<ScheduleScreen {...props} />);
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

  await render(<ScheduleScreen {...props} />);

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

  await render(<ScheduleScreen {...props} />);

  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
  expect(screen.queryByText('Elsa')).toBeNull();
  expect(mockTrainings).toHaveBeenCalledWith(11, 'upcoming');
});

test('a parent without children sees the empty message and no schedule call', async () => {
  mockSession.roleName = 'PARENT';
  mockChildren.mockResolvedValue([]);

  await render(<ScheduleScreen {...props} />);

  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
  expect(mockTrainings).not.toHaveBeenCalled();
});

test('shows the Swedish error message from the API', async () => {
  mockTrainings.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));
  mockMatches.mockResolvedValue([]);

  await render(<ScheduleScreen {...props} />);

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
  expect(screen.queryByText('Inga kommande aktiviteter')).toBeNull();
});

describe('Begär ledigt', () => {
  test('is shown only on upcoming activities that are not cancelled and have no request', async () => {
    mockTrainings.mockResolvedValue([
      // Today, but already started: not on the start page, so no button either.
      training({ id: 9, startsAt: '2026-11-22T10:00:00', endsAt: '2026-11-22T13:00:00' }),
      training({ id: 1 }),
      training({ id: 2, startsAt: '2026-11-25T17:30:00', endsAt: '2026-11-25T19:00:00', trainingStatus: 'CANCELLED' }),
      training({ id: 4, startsAt: '2026-11-26T17:30:00', endsAt: '2026-11-26T19:00:00' }),
    ]);
    mockMatches.mockResolvedValue([match({ id: 3 })]);
    mockLeave.mockResolvedValue([leave({ activityKind: 'TRAINING', activityId: 4 })]);

    await render(<ScheduleScreen {...props} />);

    const next = await screen.findByTestId('next-t1');
    expect(within(next).getByText('Begär ledigt')).toBeTruthy();
    expect(screen.queryByTestId('next-t9')).toBeNull();
    expect(screen.queryByTestId('activity-t9')).toBeNull();
    expect(within(screen.getByTestId('activity-t2')).queryByText('Begär ledigt')).toBeNull();
    expect(within(screen.getByTestId('activity-t4')).queryByText('Begär ledigt')).toBeNull();
    expect(within(screen.getByTestId('activity-m3')).getByText('Begär ledigt')).toBeTruthy();
    // A player asks for their own requests, without childId.
    expect(mockLeave).toHaveBeenCalledWith(undefined);
  });

  test('shows the request status instead of the button', async () => {
    mockTrainings.mockResolvedValue([
      training({ id: 1 }),
      training({ id: 2, startsAt: '2026-11-25T17:30:00', endsAt: '2026-11-25T19:00:00' }),
    ]);
    mockMatches.mockResolvedValue([match({ id: 3 })]);
    mockLeave.mockResolvedValue([
      leave({ id: 101, activityKind: 'TRAINING', activityId: 1, status: 'PENDING' }),
      leave({ id: 102, activityKind: 'TRAINING', activityId: 2, status: 'APPROVED' }),
      // Same id as a training, but a match: must not mix them up.
      leave({ id: 103, activityKind: 'MATCH', activityId: 3, status: 'DENIED' }),
    ]);

    await render(<ScheduleScreen {...props} />);

    const next = await screen.findByTestId('next-t1');
    expect(within(next).getByText('Väntar på svar')).toBeTruthy();
    expect(within(next).queryByText('Begär ledigt')).toBeNull();
    expect(within(screen.getByTestId('activity-t2')).getByText('Godkänd')).toBeTruthy();
    expect(within(screen.getByTestId('activity-m3')).getByText('Nekad')).toBeTruthy();
    expect(screen.queryByText('Begär ledigt')).toBeNull();
  });

  test('a player opens the form for the activity', async () => {
    mockTrainings.mockResolvedValue([training({ id: 1 })]);
    mockMatches.mockResolvedValue([]);

    await render(<ScheduleScreen {...props} />);
    await fireEvent.press(await screen.findByText('Begär ledigt'));

    expect(navigation.navigate).toHaveBeenCalledWith('RequestLeave', {
      kind: 'training',
      id: 1,
      playerUserId: undefined,
      title: 'Fotbollsträning',
      startsAt: '2026-11-24T17:30:00',
      endsAt: '2026-11-24T19:00:00',
      forName: undefined,
    });
  });

  test('a parent asks for the selected child', async () => {
    mockSession.roleName = 'PARENT';
    mockChildren.mockResolvedValue([
      { id: 11, name: 'Elsa Lind', teamId: 1, teamName: 'P12 Alfa' },
      { id: 12, name: 'Noah Lind', teamId: 2, teamName: 'P14 Beta' },
    ]);
    mockTrainings.mockResolvedValue([]);
    mockMatches.mockResolvedValue([match({ id: 3 })]);

    await render(<ScheduleScreen {...props} />);
    expect(await screen.findByText('Nästa aktivitet för Elsa')).toBeTruthy();
    await fireEvent.press(screen.getByText('Noah'));
    expect(await screen.findByText('Nästa aktivitet för Noah')).toBeTruthy();

    expect(mockLeave).toHaveBeenLastCalledWith(12);
    await fireEvent.press(screen.getByText('Begär ledigt'));
    expect(navigation.navigate).toHaveBeenCalledWith(
      'RequestLeave',
      expect.objectContaining({ kind: 'match', id: 3, playerUserId: 12, forName: 'Noah' }),
    );
  });
});
