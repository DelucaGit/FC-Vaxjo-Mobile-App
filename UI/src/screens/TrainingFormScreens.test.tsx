import { fireEvent, render, screen } from '@testing-library/react-native';
import { createTraining, getTraining, setTrainingCancelled, updateTraining } from '../api/trainings';
import CancelTrainingScreen from './CancelTrainingScreen';
import EditTrainingScreen from './EditTrainingScreen';
import NewTrainingScreen from './NewTrainingScreen';

jest.mock('../api/trainings', () => ({
  createTraining: jest.fn(),
  getTraining: jest.fn(),
  updateTraining: jest.fn(),
  setTrainingCancelled: jest.fn(),
}));

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = (params: object) => ({ navigation, route: { key: 'k', name: 'X', params } }) as any;

const saved = {
  id: 5,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2026-11-12T17:30:00',
  endsAt: '2026-11-12T19:00:00',
  title: 'Passning',
  venue: 'Konstgräset',
  status: 'SCHEDULED' as const,
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

describe('NewTrainingScreen', () => {
  test('has defaults, stays locked until valid, then creates the training', async () => {
    jest.mocked(createTraining).mockResolvedValue(saved);
    await render(<NewTrainingScreen {...props({ teamId: 10 })} />);

    expect(screen.getByLabelText('Titel').props.value).toBe('Träning');
    expect(screen.getByLabelText('Start').props.value).toBe('17:30');
    expect(screen.getByLabelText('Slut').props.value).toBe('19:00');
    const spara = screen.getByRole('button', { name: 'Spara' });
    expect(spara).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Datum'), '2026-11-12');
    await fireEvent.changeText(screen.getByLabelText('Slut'), '17:00');
    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Slut'), '19:00');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(createTraining).toHaveBeenCalledWith({
      teamId: 10,
      title: 'Träning',
      startsAt: '2026-11-12T17:30:00',
      endsAt: '2026-11-12T19:00:00',
      venue: null,
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('a 403 shows the Swedish message', async () => {
    // Real createTraining, so the text comes from readErrorMessage.
    jest.mocked(createTraining).mockImplementation((input) =>
      jest.requireActual('../api/trainings').createTraining(input),
    );
    globalThis.fetch = jest.fn(async () => new Response('Access Denied', { status: 403 })) as never;

    await render(<NewTrainingScreen {...props({ teamId: 10 })} />);
    await fireEvent.changeText(screen.getByLabelText('Datum'), '2026-11-12');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(
      await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
    ).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

describe('EditTrainingScreen', () => {
  test('loads the training and saves the changes', async () => {
    jest.mocked(getTraining).mockResolvedValue(saved);
    jest.mocked(updateTraining).mockResolvedValue(saved);
    await render(<EditTrainingScreen {...props({ trainingId: 5 })} />);

    expect((await screen.findByLabelText('Titel')).props.value).toBe('Passning');
    expect(screen.getByLabelText('Datum').props.value).toBe('2026-11-12');
    await fireEvent.changeText(screen.getByLabelText('Start'), '18:00');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(updateTraining).toHaveBeenCalledWith(5, {
      title: 'Passning',
      startsAt: '2026-11-12T18:00:00',
      endsAt: '2026-11-12T19:00:00',
      venue: 'Konstgräset',
    });
    expect(navigation.goBack).toHaveBeenCalled();
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
