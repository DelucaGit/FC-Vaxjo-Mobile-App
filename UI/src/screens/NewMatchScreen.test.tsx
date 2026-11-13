import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createMatch } from '../api/matches';
import { readErrorMessage } from '../api/http';
import { PAST_START_MESSAGE } from '../lib/activities/startTime';
import type { AppStackParamList } from '../navigation/types';
import NewMatchScreen from './NewMatchScreen';

jest.mock('../api/matches', () => ({ createMatch: jest.fn() }));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

type Props = NativeStackScreenProps<AppStackParamList, 'NewMatch'>;
const mockedCreate = createMatch as jest.Mock;

function setup() {
  const goBack = jest.fn();
  const props = {
    navigation: { goBack },
    route: { key: 'NewMatch', name: 'NewMatch', params: { teamId: 3 } },
  } as unknown as Props;
  return { goBack, props };
}

async function fillAll() {
  await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'IFK Värnamo');
  await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-21');
  await fireEvent.changeText(screen.getByLabelText('Plats'), 'Myresjöhus Arena');
  await fireEvent.press(screen.getByRole('radio', { name: 'Borta' }));
}

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

describe('NewMatchScreen', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockRole = 'COACH';
  });

  test('kick-off starts at 10:00', async () => {
    const { props } = setup();
    await render(<NewMatchScreen {...props} />);
    expect(screen.getByLabelText('Avspark').props.value).toBe('10:00');
  });

  test('Spara is locked until every field is filled in', async () => {
    const { props } = setup();
    await render(<NewMatchScreen {...props} />);
    expect(saveButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Motståndare'), 'IFK Värnamo');
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2099-11-21');
    await fireEvent.changeText(screen.getByLabelText('Plats'), 'Myresjöhus Arena');
    expect(saveButton()).toBeDisabled(); // Hemma/Borta not chosen yet

    await fireEvent.press(screen.getByRole('radio', { name: 'Hemma' }));
    expect(saveButton()).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText('Datum'), '2026-02-31');
    expect(saveButton()).toBeDisabled(); // not a real date
  });

  test('creates the match and goes back', async () => {
    mockedCreate.mockResolvedValue({ id: 1 });
    const { goBack, props } = setup();
    await render(<NewMatchScreen {...props} />);
    await fillAll();
    await fireEvent.press(saveButton());

    expect(mockedCreate).toHaveBeenCalledWith({
      teamId: 3,
      opponent: 'IFK Värnamo',
      kickoffAt: '2099-11-21T10:00:00',
      venue: 'Myresjöhus Arena',
      homeAway: 'AWAY',
    });
    expect(goBack).toHaveBeenCalled();
  });

  test('a 403 shows the Swedish message and stays on the screen', async () => {
    const message = await readErrorMessage(new Response('Access Denied', { status: 403 }));
    mockedCreate.mockRejectedValue(new Error(message));
    const { goBack, props } = setup();
    await render(<NewMatchScreen {...props} />);
    await fillAll();
    await fireEvent.press(saveButton());

    expect(await screen.findByText(message)).toBeTruthy();
    expect(message).not.toMatch(/Access Denied/);
    expect(goBack).not.toHaveBeenCalled();
  });

  test('a coach cannot save a kick-off that has passed', async () => {
    const { props } = setup();
    await render(<NewMatchScreen {...props} />);
    await fillAll();
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2011-05-01');

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(PAST_START_MESSAGE)).toBeTruthy();
    await fireEvent.press(saveButton());
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  test('a chairman cannot save a kick-off that has passed either', async () => {
    mockRole = 'CHAIRMAN';
    const { props } = setup();
    await render(<NewMatchScreen {...props} />);
    await fillAll();
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2011-05-01');
    expect(saveButton()).toBeDisabled();
  });

  test('an admin may save a kick-off that has passed', async () => {
    mockRole = 'ADMIN';
    mockedCreate.mockResolvedValue({ id: 1 });
    const { props } = setup();
    await render(<NewMatchScreen {...props} />);
    await fillAll();
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2011-05-01');

    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(PAST_START_MESSAGE)).toBeNull();
  });

  test("the API's Swedish 400 message is shown if it still says no", async () => {
    const apiMessage = 'Starttiden har redan passerat. Välj en tid som inte har varit.';
    mockedCreate.mockRejectedValue(new Error(apiMessage));
    const { goBack, props } = setup();
    await render(<NewMatchScreen {...props} />);
    await fillAll();
    await fireEvent.press(saveButton());

    expect(await screen.findByText(apiMessage)).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
  });
});
