import { fireEvent, render, screen } from '@testing-library/react-native';
import { setMatchCancelled } from '../api/matches';
import CancelMatchScreen from './CancelMatchScreen';

jest.mock('../api/matches', () => ({ setMatchCancelled: jest.fn() }));

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
type Props = Parameters<typeof CancelMatchScreen>[0];
const props = {
  navigation,
  route: { key: 'c', name: 'CancelMatch', params: { matchId: 3 } },
} as unknown as Props;

beforeEach(() => jest.clearAllMocks());

test('cancels the match with the reason and goes back', async () => {
  jest.mocked(setMatchCancelled).mockResolvedValue({} as never);

  await render(<CancelMatchScreen {...props} />);
  await fireEvent.changeText(screen.getByLabelText('Anledning (valfritt)'), '  Regn  ');
  await fireEvent.press(screen.getByRole('button', { name: 'Ställ in match' }));

  expect(setMatchCancelled).toHaveBeenCalledWith(3, true, 'Regn');
  expect(navigation.goBack).toHaveBeenCalled();
});

test('an empty reason is sent as null', async () => {
  jest.mocked(setMatchCancelled).mockResolvedValue({} as never);

  await render(<CancelMatchScreen {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Ställ in match' }));

  expect(setMatchCancelled).toHaveBeenCalledWith(3, true, null);
});

test('an API error is shown and the screen stays', async () => {
  jest.mocked(setMatchCancelled).mockRejectedValue(new Error('This match is cancelled'));

  await render(<CancelMatchScreen {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Ställ in match' }));

  expect(await screen.findByText('This match is cancelled')).toBeTruthy();
  expect(navigation.goBack).not.toHaveBeenCalled();
});
