import { fireEvent, render, screen } from '@testing-library/react-native';
import { createMatch } from '../api/matches';
import { readErrorMessage } from '../api/http';
import { listSavedVenues } from '../api/savedVenues';
import { loadVisibleTeams } from '../lib/players/teams';
import { dayAccessibilityLabel, dayKey } from '../lib/schedule/calendar';
import { PAST_START_MESSAGE } from '../lib/activities/startTime';
import NewMatchScreen from './NewMatchScreen';

jest.mock('../api/matches', () => ({ createMatch: jest.fn() }));
jest.mock('../lib/players/teams', () => ({ loadVisibleTeams: jest.fn() }));
jest.mock('../api/savedVenues', () => ({
  listSavedVenues: jest.fn(),
  createSavedVenue: jest.fn(),
  deleteSavedVenue: jest.fn(),
}));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

const ALFA = { id: 10, name: 'P2014' };
const BETA = { id: 11, name: 'F2015' };

const VENUES = [
  { id: 1, name: 'Konstgräset', address: null, createdByUserId: 1 },
  { id: 2, name: 'Kronobergsvallen 1', address: null, createdByUserId: 1 },
];

const navigation = { goBack: jest.fn(), popTo: jest.fn() };
const props = (params?: object) =>
  ({ navigation, route: { key: 'k', name: 'NewMatch', params } }) as any;

beforeEach(() => {
  mockRole = 'COACH';
  jest.clearAllMocks();
  jest.mocked(loadVisibleTeams).mockResolvedValue([ALFA, BETA]);
  jest.mocked(listSavedVenues).mockResolvedValue(VENUES);
});

// Days in next month, so they are always in the future and one "Nästa månad" away.
const now = new Date();
const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const day = (d: number) => dayKey(next.getFullYear(), next.getMonth(), d);
const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

const nextButton = () => screen.getByRole('button', { name: 'Nästa' });
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const question = (name: string) => screen.getByRole('header', { name });

/** Lag (picked from the start page), Motståndare, Hemma/Borta, Dag, Tid (10:00–11:30). Ends on Plats. */
async function fillToVenue(homeAway: 'Hemma' | 'Borta' = 'Hemma') {
  await render(<NewMatchScreen {...props({ teamId: 10 })} />);
  await screen.findByRole('header', { name: 'Vilket lag är ert?' });
  await fireEvent.press(nextButton());
  await fireEvent.changeText(screen.getByLabelText('Motståndare'), '  Alvesta IF ');
  await fireEvent.press(nextButton());
  await fireEvent.press(screen.getByRole('radio', { name: homeAway }));
  await fireEvent.press(nextButton());
  await press('Nästa månad');
  await press(dayAccessibilityLabel(day(2)));
  await fireEvent.press(nextButton());
  await fireEvent.press(nextButton());
  expect(question('Var spelas matchen?')).toBeOnTheScreen();
}

describe('NewMatchScreen (Guide, #220)', () => {
  test('from the menu with several teams, a team must be picked', async () => {
    await render(<NewMatchScreen {...props()} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });

    expect(screen.getByText('Ny match')).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'F2015' }));
    expect(nextButton()).toBeEnabled();
  });

  test('the plus button on the start page picks its team', async () => {
    await render(<NewMatchScreen {...props({ teamId: 11 })} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });
    expect(screen.getByRole('radio', { name: 'F2015' })).toBeChecked();
  });

  test('Motståndare is required', async () => {
    await render(<NewMatchScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });
    await fireEvent.press(nextButton());

    expect(question('Vilket lag möter ni?')).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Motståndare'), '   ');
    expect(nextButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'Alvesta IF');
    expect(nextButton()).toBeEnabled();
  });

  test('Hemma/Borta has exactly two choices and one must be picked', async () => {
    await render(<NewMatchScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });
    await fireEvent.press(nextButton());
    await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'Alvesta IF');
    await fireEvent.press(nextButton());

    expect(question('Hemma eller borta?')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([
      'Hemma',
      'Borta',
    ]);
    expect(nextButton()).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Borta' }));
    expect(nextButton()).toBeEnabled();
  });

  test('kick-off and end start at 10:00–11:30', async () => {
    await render(<NewMatchScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });
    await fireEvent.press(nextButton());
    await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'Alvesta IF');
    await fireEvent.press(nextButton());
    await fireEvent.press(screen.getByRole('radio', { name: 'Hemma' }));
    await fireEvent.press(nextButton());
    await press('Nästa månad');
    await press(dayAccessibilityLabel(day(2)));
    await fireEvent.press(nextButton());

    expect(screen.getByRole('tab', { name: 'Start 10:00' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Slut 11:30' })).toBeOnTheScreen();
  });

  test('Bekräfta shows every answer, then saves and lands on the start page', async () => {
    jest.mocked(createMatch).mockResolvedValue({} as never);
    await fillToVenue('Hemma');
    expect(nextButton()).toBeDisabled();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Kronobergsvallen 1' }));
    await fireEvent.press(nextButton());

    expect(question('Stämmer det här?')).toBeOnTheScreen();
    for (const text of [
      'P2014',
      'Alvesta IF',
      'Hemma',
      dayAccessibilityLabel(day(2)),
      '10:00–11:30',
      'Kronobergsvallen 1',
    ]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    expect(createMatch).not.toHaveBeenCalled();

    await press('Bekräfta');
    expect(createMatch).toHaveBeenCalledWith({
      teamId: 10,
      opponent: 'Alvesta IF',
      homeAway: 'HOME',
      kickoffAt: `${day(2)}T10:00:00`,
      endsAt: `${day(2)}T11:30:00`,
      venue: 'Kronobergsvallen 1',
    });
    expect(navigation.popTo).toHaveBeenCalledWith('Activities');
  });

  test('an away match asks for the address first and saves a typed one', async () => {
    jest.mocked(createMatch).mockResolvedValue({} as never);
    await fillToVenue('Borta');
    expect(await screen.findByLabelText('Adress till bortaplanen')).toBeOnTheScreen();
    expect(screen.getByText('Eller välj en sparad plats')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Adress till bortaplanen'), ' Lessebo IP ');
    expect(nextButton()).toBeEnabled();
    await fireEvent.press(nextButton());
    expect(screen.getByText('Lessebo IP')).toBeOnTheScreen();

    // Going back shows the typed address again.
    await press('Bakåt');
    expect((await screen.findByLabelText('Adress till bortaplanen')).props.value).toBe(' Lessebo IP ');
    await fireEvent.press(nextButton());
    await press('Bekräfta');
    expect(createMatch).toHaveBeenCalledWith(
      expect.objectContaining({ homeAway: 'AWAY', venue: 'Lessebo IP' }),
    );
  });

  test('a home match can also type another address; a saved venue empties it', async () => {
    await fillToVenue('Hemma');
    const field = await screen.findByLabelText('Eller skriv en annan adress');
    await fireEvent.changeText(field, 'Evedal IP');
    expect(nextButton()).toBeEnabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Konstgräset' }));
    expect(screen.getByRole('radio', { name: 'Konstgräset' })).toBeChecked();
    expect(screen.getByLabelText('Eller skriv en annan adress').props.value).toBe('');
  });

  test.each(['COACH', 'CHAIRMAN'])('%s cannot pick a kick-off that has passed', async (role) => {
    mockRole = role;
    await render(<NewMatchScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });
    await fireEvent.press(nextButton());
    await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'Alvesta IF');
    await fireEvent.press(nextButton());
    await fireEvent.press(screen.getByRole('radio', { name: 'Hemma' }));
    await fireEvent.press(nextButton());
    await press(dayAccessibilityLabel(todayKey));
    await fireEvent.press(nextButton());
    await fireEvent.press(screen.getByLabelText('Timme 00'));
    await fireEvent.press(screen.getByLabelText('Minut 00'));

    expect(screen.getByText(PAST_START_MESSAGE)).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();
  });

  test('an admin may pick a kick-off that has passed', async () => {
    mockRole = 'ADMIN';
    await render(<NewMatchScreen {...props({ teamId: 10 })} />);
    await screen.findByRole('header', { name: 'Vilket lag är ert?' });
    await fireEvent.press(nextButton());
    await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'Alvesta IF');
    await fireEvent.press(nextButton());
    await fireEvent.press(screen.getByRole('radio', { name: 'Hemma' }));
    await fireEvent.press(nextButton());
    await press(dayAccessibilityLabel(todayKey));
    await fireEvent.press(nextButton());
    await fireEvent.press(screen.getByLabelText('Timme 00'));
    await fireEvent.press(screen.getByLabelText('Minut 00'));

    expect(screen.queryByText(PAST_START_MESSAGE)).toBeNull();
    expect(nextButton()).toBeEnabled();
  });

  test('a 403 shows the Swedish message on the summary and stays', async () => {
    const message = await readErrorMessage(new Response('Access Denied', { status: 403 }));
    jest.mocked(createMatch).mockRejectedValue(new Error(message));
    await fillToVenue('Hemma');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Konstgräset' }));
    await fireEvent.press(nextButton());
    await press('Bekräfta');

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(message).not.toMatch(/Access Denied/);
    expect(navigation.popTo).not.toHaveBeenCalled();
  });
});
