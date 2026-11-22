import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  getTraining,
  setTrainingCancelled,
  updateTraining,
} from '../api/trainings';
import CancelTrainingScreen from './CancelTrainingScreen';
import EditTrainingScreen from './EditTrainingScreen';
import { PAST_START_MESSAGE } from '../lib/activities/startTime';

jest.mock('../api/trainings', () => ({
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

// "Ny träning" is a Guide since #216: its tests are in NewTrainingScreen.test.tsx.

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
