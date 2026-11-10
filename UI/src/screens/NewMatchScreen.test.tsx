import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createMatch } from '../api/matches';
import { readErrorMessage } from '../api/http';
import type { AppStackParamList } from '../navigation/types';
import NewMatchScreen from './NewMatchScreen';

jest.mock('../api/matches', () => ({ createMatch: jest.fn() }));

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
  await fireEvent.changeText(screen.getByLabelText('Datum'), '2026-11-21');
  await fireEvent.changeText(screen.getByLabelText('Plats'), 'Myresjöhus Arena');
  await fireEvent.press(screen.getByRole('radio', { name: 'Borta' }));
}

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

describe('NewMatchScreen', () => {
  beforeEach(() => mockedCreate.mockReset());

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
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2026-11-21');
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
      kickoffAt: '2026-11-21T10:00:00',
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
});
