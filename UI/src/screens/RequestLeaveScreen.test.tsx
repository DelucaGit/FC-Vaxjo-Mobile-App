import { fireEvent, render, screen } from '@testing-library/react-native';
import { createLeaveRequest } from '../api/leaveRequests';
import { ToastProvider } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';
import RequestLeaveScreen from './RequestLeaveScreen';

jest.mock('../api/leaveRequests', () => ({ createLeaveRequest: jest.fn() }));

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
type Props = Parameters<typeof RequestLeaveScreen>[0];

function propsFor(params: Partial<AppStackParamList['RequestLeave']> = {}): Props {
  return {
    navigation,
    route: {
      key: 'r',
      name: 'RequestLeave',
      params: {
        kind: 'training',
        id: 5,
        title: 'Fotbollsträning',
        startsAt: '2026-11-24T17:30:00',
        endsAt: '2026-11-24T19:00:00',
        ...params,
      },
    },
  } as unknown as Props;
}

async function renderScreen(params?: Partial<AppStackParamList['RequestLeave']>) {
  await render(
    <ToastProvider>
      <RequestLeaveScreen {...propsFor(params)} />
    </ToastProvider>,
  );
}

const send = () => fireEvent.press(screen.getByRole('button', { name: 'Skicka' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createLeaveRequest).mockResolvedValue({} as never);
});

test('shows which activity it is and the five reasons', async () => {
  await renderScreen();

  expect(screen.getByText('Fotbollsträning')).toBeTruthy();
  expect(screen.getByText('Tis 24 nov · 17:30–19:00')).toBeTruthy();
  for (const label of ['Sjuk', 'Skola/prov', 'Familj/resa', 'Skada', 'Annat']) {
    expect(screen.getByRole('radio', { name: label })).toBeTruthy();
  }
  // The text field is only for Annat.
  expect(screen.queryByLabelText(/Skriv orsak/)).toBeNull();
});

test('sending without a reason shows why and calls nothing', async () => {
  await renderScreen();

  await send();

  expect(screen.getByText('Välj en orsak.')).toBeTruthy();
  expect(createLeaveRequest).not.toHaveBeenCalled();
});

test('a player sends the chosen reason for a training and goes back', async () => {
  await renderScreen();

  await fireEvent.press(screen.getByRole('radio', { name: 'Sjuk' }));
  expect(screen.getByRole('radio', { name: 'Sjuk' }).props.accessibilityState).toEqual({
    selected: true,
  });
  await send();

  expect(createLeaveRequest).toHaveBeenCalledWith({
    trainingId: 5,
    reasonType: 'SICK',
    reasonText: null,
  });
  expect(navigation.goBack).toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Begäran är skickad');
});

test('a parent sends for the selected child, for a match', async () => {
  await renderScreen({ kind: 'match', id: 3, playerUserId: 11, forName: 'Elsa' });

  expect(screen.getByText('För Elsa')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Familj/resa' }));
  await send();

  expect(createLeaveRequest).toHaveBeenCalledWith({
    matchId: 3,
    playerUserId: 11,
    reasonType: 'FAMILY',
    reasonText: null,
  });
});

test('Annat with fewer than 5 characters is not sent and shows why', async () => {
  await renderScreen();

  await fireEvent.press(screen.getByRole('radio', { name: 'Annat' }));
  await fireEvent.changeText(screen.getByLabelText('Skriv orsak (minst 5 tecken)'), '  abc  ');
  await send();

  expect(screen.getByText('Skriv en orsak med minst 5 tecken.')).toBeTruthy();
  expect(createLeaveRequest).not.toHaveBeenCalled();
  expect(navigation.goBack).not.toHaveBeenCalled();
});

test('Annat with a long enough text is sent trimmed', async () => {
  await renderScreen();

  await fireEvent.press(screen.getByRole('radio', { name: 'Annat' }));
  await fireEvent.changeText(screen.getByLabelText('Skriv orsak (minst 5 tecken)'), '  Kalas  ');
  await send();

  expect(createLeaveRequest).toHaveBeenCalledWith({
    trainingId: 5,
    reasonType: 'OTHER',
    reasonText: 'Kalas',
  });
});

test('an error from the API is shown in Swedish and the screen stays', async () => {
  jest
    .mocked(createLeaveRequest)
    .mockRejectedValue(new Error('Du har redan begärt ledigt för den här aktiviteten.'));
  await renderScreen();

  await fireEvent.press(screen.getByRole('radio', { name: 'Skada' }));
  await send();

  expect(
    await screen.findByText('Du har redan begärt ledigt för den här aktiviteten.'),
  ).toBeTruthy();
  expect(navigation.goBack).not.toHaveBeenCalled();
});
