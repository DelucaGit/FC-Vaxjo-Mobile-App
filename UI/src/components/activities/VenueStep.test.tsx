import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createSavedVenue, deleteSavedVenue, listSavedVenues } from '../../api/savedVenues';
import { Guide } from '../ui/Guide';
import { NO_VENUES_MESSAGE, venueGuideStep } from './VenueStep';

jest.mock('../../api/savedVenues', () => ({
  listSavedVenues: jest.fn(),
  createSavedVenue: jest.fn(),
  deleteSavedVenue: jest.fn(),
}));

const KRONO = { id: 1, name: 'Kronobergsvallen 1', address: null, createdByUserId: 9 };
const ÖVRE = { id: 2, name: 'Övre plan', address: 'Skolgatan 3', createdByUserId: 9 };

type Answers = { venue: string };

const onFinish = jest.fn();

/** A one-step Guide with the Plats step, like the training and match guides use it. */
function Harness({ venue = '' }: { venue?: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <Guide<Answers>
      title="Test"
      steps={[
        venueGuideStep<Answers>({
          question: 'Var ska ni vara?',
          editing,
          setEditing,
          venueOf: (a) => a.venue,
          patch: (name) => ({ venue: name }),
        }),
      ]}
      initialAnswers={{ venue }}
      onFinish={onFinish}
      onExit={jest.fn()}
    />
  );
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const nextButton = () => screen.getByRole('button', { name: 'Nästa' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listSavedVenues).mockResolvedValue([KRONO, ÖVRE]);
});

describe('VenueStep (#218)', () => {
  test('lists the saved venues, and Nästa is locked until one is picked', async () => {
    await render(<Harness />);

    expect(await screen.findByRole('radio', { name: 'Kronobergsvallen 1' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Övre plan' })).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Övre plan' }));
    expect(screen.getByRole('radio', { name: 'Övre plan' })).toBeChecked();
    await fireEvent.press(nextButton());
    expect(screen.getByText('Övre plan')).toBeOnTheScreen();
    await press('Bekräfta');
    expect(onFinish).toHaveBeenCalledWith({ venue: 'Övre plan' });
  });

  test('Redigera switches to edit mode and Klar leaves it', async () => {
    await render(<Harness />);
    await screen.findByRole('radio', { name: 'Kronobergsvallen 1' });

    await press('Redigera');
    expect(screen.queryByRole('radio', { name: 'Kronobergsvallen 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ta bort Kronobergsvallen 1' })).toBeOnTheScreen();
    expect(screen.getByText('Skolgatan 3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ny plats')).toBeOnTheScreen();

    await press('Klar');
    expect(screen.getByRole('radio', { name: 'Kronobergsvallen 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Redigera' })).toBeOnTheScreen();
  });

  test('an added venue shows in the list at once and is picked', async () => {
    const added = { id: 3, name: 'Konstgräset', address: 'Värendsvägen 1', createdByUserId: 9 };
    jest.mocked(createSavedVenue).mockResolvedValue(added);
    await render(<Harness />);
    await screen.findByRole('radio', { name: 'Kronobergsvallen 1' });
    await press('Redigera');

    expect(screen.getByRole('button', { name: 'Lägg till' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Ny plats'), ' Konstgräset ');
    await fireEvent.changeText(screen.getByLabelText('Adress (valfri)'), 'Värendsvägen 1');
    await press('Lägg till');

    expect(createSavedVenue).toHaveBeenCalledWith({ name: 'Konstgräset', address: 'Värendsvägen 1' });
    expect(await screen.findByText('Konstgräset')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ny plats').props.value).toBe('');
    await press('Klar');
    expect(screen.getByRole('radio', { name: 'Konstgräset' })).toBeChecked();
    expect(nextButton()).toBeEnabled();
  });

  test('an empty address is sent as null', async () => {
    jest.mocked(createSavedVenue).mockResolvedValue({ ...KRONO, id: 4, name: 'Hallen' });
    await render(<Harness />);
    await screen.findByRole('radio', { name: 'Kronobergsvallen 1' });
    await press('Redigera');
    await fireEvent.changeText(screen.getByLabelText('Ny plats'), 'Hallen');
    await press('Lägg till');

    expect(createSavedVenue).toHaveBeenCalledWith({ name: 'Hallen', address: null });
  });

  test("a duplicate name shows the API's message", async () => {
    const message = 'Det finns redan en sparad plats med det namnet.';
    jest.mocked(createSavedVenue).mockRejectedValue(new Error(message));
    await render(<Harness />);
    await screen.findByRole('radio', { name: 'Kronobergsvallen 1' });
    await press('Redigera');
    await fireEvent.changeText(screen.getByLabelText('Ny plats'), 'kronobergsvallen 1');
    await press('Lägg till');

    expect(await screen.findByText(message)).toBeOnTheScreen();
    // The typed name stays so it can be fixed.
    expect(screen.getByLabelText('Ny plats').props.value).toBe('kronobergsvallen 1');
  });

  test('removing asks first, and removing the chosen venue un-picks it', async () => {
    jest.mocked(deleteSavedVenue).mockResolvedValue();
    await render(<Harness venue="Kronobergsvallen 1" />);
    await screen.findByRole('radio', { name: 'Kronobergsvallen 1' });
    expect(nextButton()).toBeEnabled();
    await press('Redigera');

    await press('Ta bort Kronobergsvallen 1');
    expect(screen.getByText('Ta bort Kronobergsvallen 1?')).toBeOnTheScreen();
    await press('Avbryt');
    expect(deleteSavedVenue).not.toHaveBeenCalled();

    await press('Ta bort Kronobergsvallen 1');
    await press('Ta bort');
    expect(deleteSavedVenue).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Ta bort Kronobergsvallen 1' })).toBeNull(),
    );
    await press('Klar');
    expect(screen.queryByRole('radio', { name: 'Kronobergsvallen 1' })).toBeNull();
    expect(nextButton()).toBeDisabled();
  });

  test('a failed remove shows the message and keeps the venue', async () => {
    jest.mocked(deleteSavedVenue).mockRejectedValue(new Error('Platsen finns inte.'));
    await render(<Harness />);
    await screen.findByRole('radio', { name: 'Kronobergsvallen 1' });
    await press('Redigera');
    await press('Ta bort Kronobergsvallen 1');
    await press('Ta bort');

    expect(await screen.findByText('Platsen finns inte.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ta bort Kronobergsvallen 1' })).toBeOnTheScreen();
  });

  test('with an empty list the coach is guided to add the first venue', async () => {
    jest.mocked(listSavedVenues).mockResolvedValue([]);
    await render(<Harness />);

    expect(await screen.findByText(NO_VENUES_MESSAGE)).toBeOnTheScreen();
    expect(nextButton()).toBeDisabled();
    await press('Lägg till den första platsen');
    expect(screen.getByLabelText('Ny plats')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Klar' })).toBeOnTheScreen();
  });

  test('a failed load shows the error', async () => {
    jest.mocked(listSavedVenues).mockRejectedValue(new Error('Kunde inte hämta platserna'));
    await render(<Harness />);

    expect(await screen.findByText('Kunde inte hämta platserna')).toBeOnTheScreen();
  });
});
