import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  createTraining,
  createTrainingSeries,
  getTraining,
  setTrainingCancelled,
  updateTraining,
} from '../api/trainings';
import CancelTrainingScreen from './CancelTrainingScreen';
import EditTrainingScreen from './EditTrainingScreen';
import NewTrainingScreen from './NewTrainingScreen';
import { PAST_START_MESSAGE } from '../lib/activities/startTime';
import { NONE_CREATED_MESSAGE, TOO_MANY_MESSAGE } from '../lib/activities/trainingSeries';

jest.mock('../api/trainings', () => ({
  createTraining: jest.fn(),
  createTrainingSeries: jest.fn(),
  getTraining: jest.fn(),
  updateTraining: jest.fn(),
  setTrainingCancelled: jest.fn(),
}));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

beforeEach(() => {
  mockRole = 'COACH';
  jest.clearAllMocks();
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = (params: object) => ({ navigation, route: { key: 'k', name: 'X', params } }) as any;

const saved = {
  id: 5,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2099-11-12T17:30:00',
  endsAt: '2099-11-12T19:00:00',
  type: 'FITNESS' as const,
  venue: 'Konstgräset',
  status: 'SCHEDULED' as const,
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

describe('NewTrainingScreen', () => {
  test('has defaults, stays locked until valid, then creates the training', async () => {
    jest.mocked(createTraining).mockResolvedValue(saved);
    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);

    // The type is the heading, not a field.
    expect(screen.getByText('Fotbollsträning')).toBeTruthy();
    expect(screen.queryByLabelText('Titel')).toBeNull();
    expect(screen.getByLabelText('Start').props.value).toBe('17:30');
    expect(screen.getByLabelText('Slut').props.value).toBe('19:00');
    const spara = screen.getByRole('button', { name: 'Spara' });
    expect(spara).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-12');
    await fireEvent.changeText(screen.getByLabelText('Slut'), '17:00');
    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Slut'), '19:00');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(createTraining).toHaveBeenCalledWith({
      teamId: 10,
      type: 'FOOTBALL',
      startsAt: '2099-11-12T17:30:00',
      endsAt: '2099-11-12T19:00:00',
      venue: null,
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('the fitness button sends FITNESS in the POST body', async () => {
    // Real createTraining, so we check the JSON that goes over the wire.
    jest.mocked(createTraining).mockImplementation((input) =>
      jest.requireActual('../api/trainings').createTraining(input),
    );
    const fetchMock = jest.fn(async () => new Response(JSON.stringify(saved), { status: 201 }));
    globalThis.fetch = fetchMock as never;

    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FITNESS' })} />);
    expect(screen.getByText('Fysträning')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-12');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      teamId: 10,
      type: 'FITNESS',
      startsAt: '2099-11-12T17:30:00',
      endsAt: '2099-11-12T19:00:00',
      venue: null,
    });
  });

  test('a 403 shows the Swedish message', async () => {
    // Real createTraining, so the text comes from readErrorMessage.
    jest.mocked(createTraining).mockImplementation((input) =>
      jest.requireActual('../api/trainings').createTraining(input),
    );
    globalThis.fetch = jest.fn(async () => new Response('Access Denied', { status: 403 })) as never;

    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-12');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(
      await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
    ).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test.each(['COACH', 'CHAIRMAN'])('%s cannot save a training that has passed', async (role) => {
    mockRole = role;
    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2011-05-01');

    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();
    expect(screen.getByText(PAST_START_MESSAGE)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));
    expect(createTraining).not.toHaveBeenCalled();
  });

  test('an admin may save a training that has passed', async () => {
    mockRole = 'ADMIN';
    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2011-05-01');

    expect(screen.getByRole('button', { name: 'Spara' })).toBeEnabled();
    expect(screen.queryByText(PAST_START_MESSAGE)).toBeNull();
  });

  test("the API's Swedish 400 message is shown if it still says no", async () => {
    const apiMessage = 'Starttiden har redan passerat. Välj en tid som inte har varit.';
    jest.mocked(createTraining).mockRejectedValue(new Error(apiMessage));
    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-12');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(await screen.findByText(apiMessage)).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

describe('NewTrainingScreen, Upprepa varje vecka (#132)', () => {
  // 2099-11-02 is a Monday, 2099-11-15 a Sunday: two whole weeks.
  const fillSeries = async () => {
    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-02');
    await fireEvent(screen.getByLabelText('Upprepa varje vecka'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mån' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tor' }));
    await fireEvent.changeText(screen.getByLabelText('Slutdatum'), '2099-11-15');
  };

  test('the toggle shows the weekdays and the end date, off by default', async () => {
    await render(<NewTrainingScreen {...props({ teamId: 10, type: 'FOOTBALL' })} />);
    expect(screen.queryByLabelText('Slutdatum')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Mån' })).toBeNull();

    await fireEvent(screen.getByLabelText('Upprepa varje vecka'), 'valueChange', true);

    for (const day of ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']) {
      expect(screen.getByRole('checkbox', { name: day })).toBeTruthy();
    }
    expect(screen.getByLabelText('Slutdatum')).toBeTruthy();
    // The first date is now the start of the series.
    expect(screen.getByLabelText('Startdatum')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();
  });

  test('counts the trainings and saves the series', async () => {
    jest.mocked(createTrainingSeries).mockResolvedValue([saved, saved, saved, saved]);
    await fillSeries();

    expect(screen.getByText('4 träningar skapas')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tor' }));
    expect(screen.getByText('2 träningar skapas')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tor' }));

    await fireEvent.changeText(screen.getByLabelText('Plats (valfri)'), ' Konstgräset ');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(createTrainingSeries).toHaveBeenCalledWith({
      teamId: 10,
      type: 'FOOTBALL',
      weekdays: ['MONDAY', 'THURSDAY'],
      startTime: '17:30',
      endTime: '19:00',
      venue: 'Konstgräset',
      fromDate: '2099-11-02',
      toDate: '2099-11-15',
    });
    expect(createTraining).not.toHaveBeenCalled();
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  test('more than 60 trainings shows a message and locks Spara', async () => {
    await fillSeries();
    await fireEvent.changeText(screen.getByLabelText('Slutdatum'), '2101-12-31');

    expect(screen.getByText(TOO_MANY_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/träningar skapas/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));
    expect(createTrainingSeries).not.toHaveBeenCalled();
  });

  test('an empty answer stays on the screen with a message', async () => {
    jest.mocked(createTrainingSeries).mockResolvedValue([]);
    await fillSeries();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(await screen.findByText(NONE_CREATED_MESSAGE)).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test("the API's error message is shown", async () => {
    jest.mocked(createTrainingSeries).mockRejectedValue(new Error('Serverfel'));
    await fillSeries();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(await screen.findByText('Serverfel')).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('turning the toggle off again saves one training as before', async () => {
    jest.mocked(createTraining).mockResolvedValue(saved);
    await fillSeries();
    await fireEvent(screen.getByLabelText('Upprepa varje vecka'), 'valueChange', false);

    expect(screen.queryByLabelText('Slutdatum')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(createTraining).toHaveBeenCalledWith({
      teamId: 10,
      type: 'FOOTBALL',
      startsAt: '2099-11-02T17:30:00',
      endsAt: '2099-11-02T19:00:00',
      venue: null,
    });
    expect(createTrainingSeries).not.toHaveBeenCalled();
  });
});

describe('EditTrainingScreen', () => {
  test('loads the training and saves the changes', async () => {
    jest.mocked(getTraining).mockResolvedValue(saved);
    jest.mocked(updateTraining).mockResolvedValue(saved);
    await render(<EditTrainingScreen {...props({ trainingId: 5 })} />);

    expect((await screen.findByLabelText('Datum')).props.value).toBe('2099-11-12');
    // The saved type is shown read-only in the heading; there is no title field.
    expect(screen.getByText('Redigera fysträning')).toBeTruthy();
    expect(screen.queryByLabelText('Titel')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Start'), '18:00');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(updateTraining).toHaveBeenCalledWith(5, {
      type: 'FITNESS',
      startsAt: '2099-11-12T18:00:00',
      endsAt: '2099-11-12T19:00:00',
      venue: 'Konstgräset',
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  const oldTraining = {
    ...saved,
    startsAt: '2011-05-01T17:30:00',
    endsAt: '2011-05-01T19:00:00',
  };

  test('a coach may change only the place of an old training', async () => {
    jest.mocked(getTraining).mockResolvedValue(oldTraining);
    jest.mocked(updateTraining).mockResolvedValue(oldTraining);
    await render(<EditTrainingScreen {...props({ trainingId: 5 })} />);

    await fireEvent.changeText(await screen.findByLabelText('Plats (valfri)'), 'Nya hallen');
    expect(screen.queryByText(PAST_START_MESSAGE)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(updateTraining).toHaveBeenCalledWith(5, expect.objectContaining({
      startsAt: '2011-05-01T17:30:00',
      venue: 'Nya hallen',
    }));
  });

  test('a coach cannot move a training to a time that has passed', async () => {
    jest.mocked(getTraining).mockResolvedValue(oldTraining);
    await render(<EditTrainingScreen {...props({ trainingId: 5 })} />);

    await fireEvent.changeText(await screen.findByLabelText('Start'), '18:00');

    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();
    expect(screen.getByText(PAST_START_MESSAGE)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));
    expect(updateTraining).not.toHaveBeenCalled();
  });
});

describe('CancelTrainingScreen', () => {
  test('cancels with the reason', async () => {
    jest.mocked(setTrainingCancelled).mockResolvedValue(saved);
    await render(<CancelTrainingScreen {...props({ trainingId: 5 })} />);

    await fireEvent.changeText(screen.getByLabelText('Anledning (valfritt)'), ' Snö ');
    await fireEvent.press(screen.getByRole('button', { name: 'Ställ in träning' }));

    expect(setTrainingCancelled).toHaveBeenCalledWith(5, true, 'Snö');
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('an empty reason is sent as null', async () => {
    jest.mocked(setTrainingCancelled).mockResolvedValue(saved);
    await render(<CancelTrainingScreen {...props({ trainingId: 5 })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ställ in träning' }));
    expect(setTrainingCancelled).toHaveBeenCalledWith(5, true, null);
  });
});
