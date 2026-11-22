import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { listMatchAttendance, listMatches } from '../api/matches';
import { listMyTeams, listTeams } from '../api/teams';
import { listTrainingAttendance, listTrainings } from '../api/trainings';
import { pullToRefresh } from '../test/pullToRefresh';
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

// Far in the future, so every activity is upcoming whatever day the tests run.
const training = {
  id: 1,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2099-01-05T17:30:00',
  endsAt: '2099-01-05T19:00:00',
  type: 'FOOTBALL',
  venue: 'Konstgräset',
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

const match = {
  id: 1,
  teamId: 20,
  teamName: 'F2015',
  opponent: 'Östers IF',
  kickoffAt: '2099-01-06T10:00:00',
  venue: 'Värendsvallen',
  homeAway: 'AWAY',
  result: null,
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

/** Each team's own activities, the way the API answers per team. */
function mockActivities(trainings: object[], matches: object[]) {
  jest
    .mocked(listTrainings)
    .mockImplementation(
      async (teamId) => trainings.filter((t) => (t as { teamId: number }).teamId === teamId) as never,
    );
  jest
    .mocked(listMatches)
    .mockImplementation(
      async (teamId) => matches.filter((m) => (m as { teamId: number }).teamId === teamId) as never,
    );
}

const twoTeams = [
  { id: 10, name: 'P2014' },
  { id: 20, name: 'F2015' },
];

/** The testIDs of the Kommande vecka cards, top to bottom. */
const cardIds = () => screen.queryAllByTestId(/^activity-/).map((el) => el.props.testID);

beforeEach(() => {
  jest.clearAllMocks();
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

describe('the start page', () => {
  beforeEach(() => {
    jest.mocked(listMyTeams).mockResolvedValue(twoTeams);
    mockActivities(
      [
        training,
        {
          ...training,
          id: 2,
          teamId: 20,
          teamName: 'F2015',
          type: 'FITNESS',
          venue: '',
          startsAt: '2099-01-08T17:30:00',
          endsAt: '2099-01-08T19:00:00',
        },
      ],
      [
        match,
        // More than seven days after the next activity: only after "Visa fler".
        { ...match, id: 2, teamId: 10, teamName: 'P2014', kickoffAt: '2099-01-15T10:00:00' },
      ],
    );
  });

  test("shows Nästa aktivitet and Kommande vecka for all the coach's teams, with team names", async () => {
    await render(<ActivitiesScreen {...props} />);

    const next = await screen.findByTestId('next-t1');
    expect(within(next).getByText('Nästa aktivitet')).toBeTruthy();
    expect(within(next).getByText('Fotbollsträning')).toBeTruthy();
    expect(within(next).getByText('Konstgräset · P2014')).toBeTruthy();

    expect(screen.getByText('Kommande vecka')).toBeTruthy();
    // Trainings and matches from both teams together, soonest first.
    expect(cardIds()).toEqual(['activity-m1', 'activity-t2']);
    expect(within(screen.getByTestId('activity-m1')).getByText(/Värendsvallen · Borta · F2015/)).toBeTruthy();
    expect(within(screen.getByTestId('activity-t2')).getByText(/F2015/)).toBeTruthy();

    // A coach asks only for their own teams.
    expect(listTeams).not.toHaveBeenCalled();
    expect(listTrainings).toHaveBeenCalledWith(10, 'upcoming');
    expect(listTrainings).toHaveBeenCalledWith(20, 'upcoming');
    expect(listMatches).toHaveBeenCalledWith(10, 'upcoming');
    expect(listMatches).toHaveBeenCalledWith(20, 'upcoming');
  });

  test('"Visa fler" adds the next seven days', async () => {
    await render(<ActivitiesScreen {...props} />);
    await screen.findByTestId('next-t1');
    expect(screen.queryByTestId('activity-m2')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Visa fler' }));

    expect(cardIds()).toEqual(['activity-m1', 'activity-t2', 'activity-m2']);
    expect(within(screen.getByTestId('activity-m2')).getByText(/P2014/)).toBeTruthy();
    expect(screen.getByText('Kommande aktiviteter')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Visa fler' })).toBeNull();
  });

  test('a tap on a card opens the activity', async () => {
    await render(<ActivitiesScreen {...props} />);

    await fireEvent.press(await screen.findByTestId('next-t1'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('ActivityDetail', { kind: 'training', id: 1 });

    await fireEvent.press(screen.getByTestId('activity-m1'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('ActivityDetail', { kind: 'match', id: 1 });
  });

  test('the team picker narrows the page to one team and gives the plus button that team', async () => {
    await render(<ActivitiesScreen {...props} />);
    await screen.findByTestId('next-t1');
    // With every team shown the create screens would not know which team to use.
    expect(screen.queryByRole('button', { name: 'Lägg till aktivitet' })).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'F2015' }));

    expect(screen.getByTestId('next-m1')).toBeTruthy();
    expect(cardIds()).toEqual(['activity-t2']);
    expect(screen.queryByTestId('next-t1')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Lägg till aktivitet' }));
    await fireEvent.press(screen.getByText('Ny match'));
    expect(navigation.navigate).toHaveBeenCalledWith('NewMatch', { teamId: 20 });
  });
});

test('a cancelled activity shows Inställd and the reason', async () => {
  mockActivities(
    [{ ...training, status: 'CANCELLED', cancelReason: 'Snö' }],
    [{ ...match, teamId: 10, teamName: 'P2014', status: 'CANCELLED', cancelReason: 'Regn' }],
  );
  await render(<ActivitiesScreen {...props} />);

  const next = await screen.findByTestId('next-t1');
  expect(within(next).getByText('Inställd · Snö')).toBeTruthy();
  expect(within(next).getByText('Fotbollsträning')).toHaveStyle({ textDecorationLine: 'line-through' });
  const card = screen.getByTestId('activity-m1');
  expect(within(card).getByText('Inställd · Regn')).toBeTruthy();
  expect(within(card).getByText('Match mot Östers IF')).toHaveStyle({
    textDecorationLine: 'line-through',
  });
});

test('says so when there is nothing coming up', async () => {
  await render(<ActivitiesScreen {...props} />);
  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();
});

describe('the plus button', () => {
  const openMenu = async () => {
    await render(<ActivitiesScreen {...props} />);
    await screen.findByText('Inga kommande aktiviteter');
    await fireEvent.press(screen.getByRole('button', { name: 'Lägg till aktivitet' }));
  };

  test('is closed at first and shows the three choices on a tap', async () => {
    await render(<ActivitiesScreen {...props} />);
    await screen.findByText('Inga kommande aktiviteter');
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

test('a chairman sees the activities of all teams', async () => {
  mockRole = 'CHAIRMAN';
  mockActivities([training], [match]);
  await render(<ActivitiesScreen {...props} />);

  expect(await screen.findByTestId('next-t1')).toBeTruthy();
  expect(screen.getByTestId('activity-m1')).toBeTruthy();
  expect(listMyTeams).not.toHaveBeenCalled();
  expect(listTrainings).toHaveBeenCalledWith(10, 'upcoming');
  expect(listTrainings).toHaveBeenCalledWith(20, 'upcoming');
});

test('pulling the list down loads the activities again', async () => {
  await render(<ActivitiesScreen {...props} />);
  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();

  jest.mocked(listTrainings).mockResolvedValue([training] as never);
  await pullToRefresh();

  expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
  expect(screen.queryByText('Inga kommande aktiviteter')).toBeNull();
});

test('a failed refresh shows the same error message', async () => {
  await render(<ActivitiesScreen {...props} />);
  expect(await screen.findByText('Inga kommande aktiviteter')).toBeTruthy();

  jest.mocked(listTrainings).mockRejectedValue(
    new Error('Den här funktionen är inte tillgänglig för din roll än.'),
  );
  await pullToRefresh();

  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
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
