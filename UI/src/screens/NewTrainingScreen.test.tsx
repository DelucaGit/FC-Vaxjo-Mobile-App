import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createTraining, createTrainingSeries } from '../api/trainings';
import { loadVisibleTeams } from '../lib/players/teams';
import { dayAccessibilityLabel, dayKey } from '../lib/schedule/calendar';
import { PAST_START_MESSAGE } from '../lib/activities/startTime';
import { NONE_CREATED_MESSAGE, TOO_MANY_MESSAGE } from '../lib/activities/trainingSeries';
import NewTrainingScreen from './NewTrainingScreen';

jest.mock('../api/trainings', () => ({
  createTraining: jest.fn(),
  createTrainingSeries: jest.fn(),
}));
jest.mock('../lib/players/teams', () => ({ loadVisibleTeams: jest.fn() }));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

const ALFA = { id: 10, name: 'P2014' };
const BETA = { id: 11, name: 'F2015' };

const navigation = { goBack: jest.fn(), popTo: jest.fn() };
const props = (params?: object) =>
  ({ navigation, route: { key: 'k', name: 'NewTraining', params } }) as any;

beforeEach(() => {
  mockRole = 'COACH';
  jest.clearAllMocks();
  jest.mocked(loadVisibleTeams).mockResolvedValue([ALFA, BETA]);
});

// Days in next month, so they are always in the future and one "Nästa månad" away.
const now = new Date();
const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const day = (d: number) => dayKey(next.getFullYear(), next.getMonth(), d);
const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

const saved = {
  id: 5,
  teamId: 10,
  teamName: 'P2014',
  startsAt: `${day(2)}T17:30:00`,
  endsAt: `${day(2)}T19:00:00`,
  type: 'FOOTBALL' as const,
  venue: null,
  status: 'SCHEDULED' as const,
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

const nextButton = () => screen.getByRole('button', { name: 'Nästa' });
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const question = (name: string) => screen.getByRole('header', { name });

async function pickDay(key: string, monthsAhead = 1) {
  for (let i = 0; i < monthsAhead; i++) {
    await press('Nästa månad');
  }
  await press(dayAccessibilityLabel(key));
}

/** Lag (already picked), Dag, Tid (default 17:30–19:00), Plats. Ends on Upprepa. */
async function fillToRepeat(venue = '') {
  await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
  await screen.findByRole('header', { name: 'Vilket lag?' });
  await fireEvent.press(nextButton());
  await pickDay(day(2));
  await fireEvent.press(nextButton());
  await fireEvent.press(nextButton());
  if (venue) await fireEvent.changeText(screen.getByLabelText('Plats (valfri)'), venue);
  await fireEvent.press(nextButton());
  expect(question('Upprepa varje vecka?')).toBeOnTheScreen();
}

describe('NewTrainingScreen (Guide, #216)', () => {
  test('a coach with one team still sees the Lag step, with the team picked', async () => {
    jest.mocked(loadVisibleTeams).mockResolvedValue([ALFA]);
    await render(<NewTrainingScreen {...props()} />);

    expect(await screen.findByRole('header', { name: 'Vilket lag?' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'P2014' })).toBeChecked();
    expect(nextButton()).toBeEnabled();
    // From the menu there is no type, so the title is the guide's name.
    expect(screen.getByText('Ny träning')).toBeOnTheScreen();
  });

  test('with several teams from the menu, a team must be picked', async () => {
    await render(<NewTrainingScreen {...props()} />);
    await screen.findByRole('header', { name: 'Vilket lag?' });

    expect(screen.getByRole('radio', { name: 'P2014' })).not.toBeChecked();
    expect(nextButton()).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'F2015' }));
    expect(nextButton()).toBeEnabled();
  });

  test('the plus button on the start page picks its team and its type', async () => {
    await render(<NewTrainingScreen {...props({ teamId: 11, type: 'FITNESS' })} />);
    await screen.findByRole('header', { name: 'Vilket lag?' });

    expect(screen.getByRole('radio', { name: 'F2015' })).toBeChecked();
    expect(screen.getByText('Fysträning')).toBeOnTheScreen();
  });

  test('asks Lag, Dag, Tid, Plats, Upprepa, and going back keeps the answers', async () => {
    await fillToRepeat('Konstgräset');
    await fireEvent.press(screen.getByRole('radio', { name: 'Nej, bara en gång' }));

    await press('Bakåt');
    expect(question('Var ska ni vara?')).toBeOnTheScreen();
    expect(screen.getByLabelText('Plats (valfri)').props.value).toBe('Konstgräset');
    await press('Bakåt');
    expect(question('Vilken tid?')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Start 17:30' })).toBeOnTheScreen();
    await press('Bakåt');
    expect(question('Vilken dag?')).toBeOnTheScreen();
    // The chosen day's month is shown again, with the day still chosen.
    expect(screen.getByRole('button', { name: dayAccessibilityLabel(day(2)) })).toBeSelected();

    await fireEvent.press(nextButton());
    await fireEvent.press(nextButton());
    await fireEvent.press(nextButton());
    expect(screen.getByRole('radio', { name: 'Nej, bara en gång' })).toBeChecked();
  });

  test('a day must be picked before Nästa', async () => {
    await render(<NewTrainingScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag?' });
    await fireEvent.press(nextButton());

    expect(nextButton()).toBeDisabled();
    await pickDay(day(5));
    expect(nextButton()).toBeEnabled();
  });

  test('without repeat, Bekräfta shows the summary and creates one training', async () => {
    jest.mocked(createTraining).mockResolvedValue(saved);
    await fillToRepeat(' Konstgräset ');
    expect(nextButton()).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Nej, bara en gång' }));
    await fireEvent.press(nextButton());

    expect(question('Stämmer det här?')).toBeOnTheScreen();
    expect(screen.getByText('P2014')).toBeOnTheScreen();
    expect(screen.getByText(dayAccessibilityLabel(day(2)))).toBeOnTheScreen();
    expect(screen.getByText('17:30–19:00')).toBeOnTheScreen();
    expect(screen.getByText('Konstgräset')).toBeOnTheScreen();
    expect(screen.getByText('Nej, bara en gång')).toBeOnTheScreen();

    await press('Bekräfta');

    expect(createTraining).toHaveBeenCalledWith({
      teamId: 10,
      type: 'FOOTBALL',
      startsAt: `${day(2)}T17:30:00`,
      endsAt: `${day(2)}T19:00:00`,
      venue: 'Konstgräset',
    });
    expect(createTrainingSeries).not.toHaveBeenCalled();
    // Back on the start page, which reloads on focus.
    await waitFor(() => expect(navigation.popTo).toHaveBeenCalledWith('Activities'));
  });

  test('with repeat, a weekly training series is created on the same weekday', async () => {
    jest.mocked(createTrainingSeries).mockResolvedValue([saved, saved, saved]);
    await fillToRepeat();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ja, varje vecka' }));
    expect(nextButton()).toBeDisabled();

    expect(screen.getByText('Sista dagen')).toBeOnTheScreen();
    await pickDay(day(16));
    expect(screen.getByText('3 träningar skapas')).toBeOnTheScreen();
    await fireEvent.press(nextButton());

    expect(
      screen.getByText(`Varje vecka till ${dayAccessibilityLabel(day(16))} (3 träningar skapas)`),
    ).toBeOnTheScreen();
    expect(screen.getByText('Ingen plats')).toBeOnTheScreen();
    await press('Bekräfta');

    const weekday = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
      new Date(next.getFullYear(), next.getMonth(), 2).getDay()
    ];
    expect(createTrainingSeries).toHaveBeenCalledWith({
      teamId: 10,
      type: 'FOOTBALL',
      weekdays: [weekday],
      startTime: '17:30',
      endTime: '19:00',
      venue: null,
      fromDate: day(2),
      toDate: day(16),
    });
    expect(createTraining).not.toHaveBeenCalled();
    await waitFor(() => expect(navigation.popTo).toHaveBeenCalledWith('Activities'));
  });

  test('a last day before the first day is not taken', async () => {
    await fillToRepeat();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ja, varje vecka' }));
    // Today is before the first day (next month).
    await press(dayAccessibilityLabel(todayKey));

    expect(screen.getByRole('button', { name: dayAccessibilityLabel(todayKey) })).not.toBeSelected();
    expect(nextButton()).toBeDisabled();
  });

  test('more than 60 trainings shows a message and locks Nästa', async () => {
    await fillToRepeat();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ja, varje vecka' }));
    // 15 months after the first day: more than 60 weeks.
    const far = new Date(next.getFullYear(), next.getMonth() + 15, 1);
    await pickDay(dayKey(far.getFullYear(), far.getMonth(), 1), 16);

    expect(screen.getByText(TOO_MANY_MESSAGE)).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();
  });

  test('an API error is shown in Swedish and the answers are kept', async () => {
    // Real createTraining, so the text comes from readErrorMessage.
    jest.mocked(createTraining).mockImplementation((input) =>
      jest.requireActual('../api/trainings').createTraining(input),
    );
    globalThis.fetch = jest.fn(async () => new Response('Access Denied', { status: 403 })) as never;
    await fillToRepeat('Konstgräset');
    await fireEvent.press(screen.getByRole('radio', { name: 'Nej, bara en gång' }));
    await fireEvent.press(nextButton());
    await press('Bekräfta');

    expect(
      await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
    ).toBeOnTheScreen();
    expect(navigation.popTo).not.toHaveBeenCalled();
    // Still on the summary with every answer, and Bekräfta can be tried again.
    expect(screen.getByText('Konstgräset')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bekräfta' })).toBeEnabled();
    await press('Bakåt');
    expect(screen.getByRole('radio', { name: 'Nej, bara en gång' })).toBeChecked();
  });

  test('a series where every date has passed stays on the summary', async () => {
    jest.mocked(createTrainingSeries).mockResolvedValue([]);
    await fillToRepeat();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ja, varje vecka' }));
    await pickDay(day(16));
    await fireEvent.press(nextButton());
    await press('Bekräfta');

    expect(await screen.findByText(NONE_CREATED_MESSAGE)).toBeOnTheScreen();
    expect(navigation.popTo).not.toHaveBeenCalled();
  });

  test.each(['COACH', 'CHAIRMAN'])('%s cannot go on with a time that has passed today', async (role) => {
    mockRole = role;
    await render(<NewTrainingScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag?' });
    await fireEvent.press(nextButton());
    await press(dayAccessibilityLabel(todayKey));
    await fireEvent.press(nextButton());

    await fireEvent.press(screen.getByLabelText('Timme 00'));
    await fireEvent.press(screen.getByLabelText('Minut 00'));

    expect(screen.getByText(PAST_START_MESSAGE)).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();
  });

  test('an admin may go on with a time that has passed today', async () => {
    mockRole = 'ADMIN';
    await render(<NewTrainingScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag?' });
    await fireEvent.press(nextButton());
    await press(dayAccessibilityLabel(todayKey));
    await fireEvent.press(nextButton());

    await fireEvent.press(screen.getByLabelText('Timme 00'));
    await fireEvent.press(screen.getByLabelText('Minut 00'));

    expect(screen.queryByText(PAST_START_MESSAGE)).toBeNull();
    expect(nextButton()).toBeEnabled();
  });

  test('a failed team load shows the error', async () => {
    jest.mocked(loadVisibleTeams).mockRejectedValue(new Error('Kunde inte hämta lagen'));
    await render(<NewTrainingScreen {...props()} />);

    expect(await screen.findByText('Kunde inte hämta lagen')).toBeOnTheScreen();
  });
});
