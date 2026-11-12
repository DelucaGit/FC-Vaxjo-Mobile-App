import { fireEvent, render, screen } from '@testing-library/react-native';
import { getMatch, updateMatch } from '../api/matches';
import { PAST_START_MESSAGE } from '../lib/activities/startTime';
import EditMatchScreen from './EditMatchScreen';

jest.mock('../api/matches', () => ({ getMatch: jest.fn(), updateMatch: jest.fn() }));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

beforeEach(() => {
  mockRole = 'COACH';
  jest.clearAllMocks();
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
type Props = Parameters<typeof EditMatchScreen>[0];
const props = { navigation, route: { key: 'k', name: 'EditMatch', params: { matchId: 3 } } } as unknown as Props;

const saved = {
  id: 3,
  teamId: 10,
  teamName: 'P2014',
  opponent: 'Östers IF',
  kickoffAt: '2099-11-21T10:00:00',
  venue: 'Värendsvallen',
  homeAway: 'HOME' as const,
  result: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

test('the form is filled in with the saved match', async () => {
  jest.mocked(getMatch).mockResolvedValue(saved);
  await render(<EditMatchScreen {...props} />);

  expect((await screen.findByLabelText('Motståndare')).props.value).toBe('Östers IF');
  expect(screen.getByLabelText('Datum').props.value).toBe('2099-11-21');
  expect(screen.getByLabelText('Avspark').props.value).toBe('10:00');
  expect(screen.getByLabelText('Plats').props.value).toBe('Värendsvallen');
  expect(screen.getByRole('radio', { name: 'Hemma' })).toBeChecked();
});

test('saving sends the changes and goes back', async () => {
  jest.mocked(getMatch).mockResolvedValue(saved);
  jest.mocked(updateMatch).mockResolvedValue(saved);
  await render(<EditMatchScreen {...props} />);

  await fireEvent.changeText(await screen.findByLabelText('Avspark'), '13:30');
  await fireEvent.changeText(screen.getByLabelText('Plats'), 'Myresjöhus Arena');
  await fireEvent.press(screen.getByRole('radio', { name: 'Borta' }));
  await fireEvent.press(saveButton());

  expect(updateMatch).toHaveBeenCalledWith(3, {
    opponent: 'Östers IF',
    kickoffAt: '2099-11-21T13:30:00',
    venue: 'Myresjöhus Arena',
    homeAway: 'AWAY',
  });
  expect(navigation.goBack).toHaveBeenCalled();
});

test('an error from the API is shown and the screen stays', async () => {
  jest.mocked(getMatch).mockResolvedValue(saved);
  jest.mocked(updateMatch).mockRejectedValue(new Error('Du har inte behörighet.'));
  await render(<EditMatchScreen {...props} />);

  await screen.findByLabelText('Motståndare');
  await fireEvent.press(saveButton());

  expect(await screen.findByText('Du har inte behörighet.')).toBeTruthy();
  expect(navigation.goBack).not.toHaveBeenCalled();
});

test('a coach may change the place of an old match but not move it to the past', async () => {
  jest.mocked(getMatch).mockResolvedValue({ ...saved, kickoffAt: '2011-05-01T10:00:00' });
  jest.mocked(updateMatch).mockResolvedValue(saved);
  await render(<EditMatchScreen {...props} />);

  await fireEvent.changeText(await screen.findByLabelText('Plats'), 'Nya planen');
  expect(screen.queryByText(PAST_START_MESSAGE)).toBeNull();
  expect(saveButton()).toBeEnabled();

  await fireEvent.changeText(screen.getByLabelText('Avspark'), '12:00');
  expect(screen.getByText(PAST_START_MESSAGE)).toBeTruthy();
  expect(saveButton()).toBeDisabled();
});
