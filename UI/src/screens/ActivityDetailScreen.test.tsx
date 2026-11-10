import { fireEvent, render, screen } from '@testing-library/react-native';
import { getMatch, listMatchAttendance } from '../api/matches';
import { getTraining, listTrainingAttendance, setTrainingCancelled } from '../api/trainings';
import ActivityDetailScreen from './ActivityDetailScreen';

jest.mock('../api/trainings', () => ({
  getTraining: jest.fn(),
  listTrainingAttendance: jest.fn(),
  setTrainingCancelled: jest.fn(),
}));
jest.mock('../api/matches', () => ({ getMatch: jest.fn(), listMatchAttendance: jest.fn() }));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
type Props = Parameters<typeof ActivityDetailScreen>[0];
const propsFor = (kind: 'training' | 'match', id: number) =>
  ({ navigation, route: { key: 'd', name: 'ActivityDetail', params: { kind, id } } }) as unknown as Props;

const training = {
  id: 5,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2020-11-10T17:30:00',
  endsAt: '2020-11-10T19:00:00',
  title: 'Passning',
  venue: null,
  status: 'SCHEDULED' as const,
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

test('training: info rows, actions and the Närvaro button', async () => {
  jest.mocked(getTraining).mockResolvedValue(training);
  jest.mocked(listTrainingAttendance).mockResolvedValue([
    { playerUserId: 1, playerName: 'A', playerNumber: 7, status: null },
  ]);

  await render(<ActivityDetailScreen {...propsFor('training', 5)} />);

  expect(await screen.findByText('1 ej markerade')).toBeTruthy();
  expect(screen.getByText('Passning')).toBeTruthy();
  expect(screen.getByText('P2014')).toBeTruthy();

  await fireEvent.press(screen.getByText('Redigera träning'));
  expect(navigation.navigate).toHaveBeenCalledWith('EditTraining', { trainingId: 5 });
  await fireEvent.press(screen.getByText('Ställ in träning'));
  expect(navigation.navigate).toHaveBeenCalledWith('CancelTraining', { trainingId: 5 });
  await fireEvent.press(screen.getByRole('button', { name: 'Närvaro' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Attendance', { kind: 'training', id: 5 });
  expect(screen.queryByText('Återaktivera')).toBeNull();
});

test('cancelled training is struck through and can be reactivated', async () => {
  const cancelled = { ...training, status: 'CANCELLED' as const, cancelReason: 'Snö' };
  jest.mocked(getTraining).mockResolvedValueOnce(cancelled).mockResolvedValueOnce(training);
  jest.mocked(listTrainingAttendance).mockResolvedValue([]);
  jest.mocked(setTrainingCancelled).mockResolvedValue(training);

  await render(<ActivityDetailScreen {...propsFor('training', 5)} />);

  expect(await screen.findByText('Inställd · Snö')).toBeTruthy();
  expect(screen.getByText('Passning')).toHaveStyle({ textDecorationLine: 'line-through' });
  expect(screen.queryByText('Ställ in träning')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Närvaro' })).toBeNull();

  await fireEvent.press(screen.getByText('Återaktivera'));

  expect(setTrainingCancelled).toHaveBeenCalledWith(5, false);
  expect(await screen.findByRole('button', { name: 'Närvaro' })).toBeTruthy();
  expect(screen.queryByText('Inställd · Snö')).toBeNull();
});

test('match: result, Hemma/Borta, lock stamp and only "Ange resultat"', async () => {
  jest.mocked(getMatch).mockResolvedValue({
    id: 3,
    teamId: 10,
    teamName: 'P2014',
    opponent: 'Östers IF',
    kickoffAt: '2020-11-21T10:00:00',
    venue: 'Värendsvallen',
    homeAway: 'HOME',
    result: null,
    createdByUserId: 1,
    attendanceLockedAt: '2020-11-21T19:05:00',
  });

  await render(<ActivityDetailScreen {...propsFor('match', 3)} />);

  expect(await screen.findByText('Match mot Östers IF')).toBeTruthy();
  expect(screen.getByText('Hemma')).toBeTruthy();
  expect(screen.getByText('–')).toBeTruthy();
  expect(screen.getByText('Låst 21 nov 19:05')).toBeTruthy();
  expect(screen.queryByText('Redigera träning')).toBeNull();
  expect(screen.queryByText('Ställ in träning')).toBeNull();
  expect(listMatchAttendance).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText('Ange resultat'));
  expect(navigation.navigate).toHaveBeenCalledWith('SetResult', { matchId: 3 });
});
