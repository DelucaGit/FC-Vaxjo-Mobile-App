import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import {
  approveLeaveRequest,
  denyLeaveRequest,
  listLeaveRequests,
  type LeaveRequest,
} from '../api/leaveRequests';
import { ToastProvider } from '../components/ui';
import { pullToRefresh } from '../test/pullToRefresh';
import LeaveRequestsScreen from './LeaveRequestsScreen';

jest.mock('../api/leaveRequests', () => ({
  listLeaveRequests: jest.fn(),
  approveLeaveRequest: jest.fn(),
  denyLeaveRequest: jest.fn(),
}));

// The page reloads on focus; in a test "focus" is simply the first render.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const mockList = jest.mocked(listLeaveRequests);
const mockApprove = jest.mocked(approveLeaveRequest);
const mockDeny = jest.mocked(denyLeaveRequest);

function request(overrides: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 1,
    playerUserId: 7,
    playerName: 'Elsa Berg',
    activityKind: 'TRAINING',
    activityId: 10,
    activityStart: '2026-11-24T17:30:00',
    teamId: 3,
    teamName: 'P12 Alfa',
    reasonType: 'SICK',
    reasonText: null,
    status: 'PENDING',
    coachNote: null,
    createdAt: '2026-11-20T08:00:00',
    ...overrides,
  };
}

async function renderPage() {
  await render(
    <ToastProvider>
      <LeaveRequestsScreen />
    </ToastProvider>,
  );
}

function card(id: number) {
  return within(screen.getByTestId(`leave-${id}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([
    request({ id: 1 }),
    request({
      id: 2,
      playerName: 'Bo Ek',
      activityKind: 'MATCH',
      reasonType: 'OTHER',
      reasonText: 'Kalas hos mormor',
    }),
  ]);
  mockApprove.mockImplementation(async (id) => request({ id, status: 'APPROVED' }));
  mockDeny.mockImplementation(async (id) => request({ id, status: 'DENIED' }));
});

test('lists the pending requests with player, activity and orsak', async () => {
  await renderPage();

  await screen.findByTestId('leave-1');
  expect(mockList).toHaveBeenCalledWith({ status: 'PENDING' });
  expect(card(1).getByText('Elsa Berg')).toBeTruthy();
  expect(card(1).getByText(/^Träning · P12 Alfa · /)).toBeTruthy();
  expect(card(1).getByText('Orsak: Sjuk')).toBeTruthy();
  expect(card(1).getByText('Väntar på svar')).toBeTruthy();
  expect(card(2).getByText('Bo Ek')).toBeTruthy();
  expect(card(2).getByText(/^Match · P12 Alfa · /)).toBeTruthy();
  expect(card(2).getByText('Orsak: Annat – Kalas hos mormor')).toBeTruthy();
  expect(card(1).getByRole('button', { name: 'Godkänn' })).toBeTruthy();
  expect(card(1).getByRole('button', { name: 'Neka' })).toBeTruthy();
});

test('Godkänn answers the request and removes it from the list', async () => {
  await renderPage();
  await screen.findByTestId('leave-1');

  await fireEvent.press(card(1).getByRole('button', { name: 'Godkänn' }));

  expect(mockApprove).toHaveBeenCalledWith(1);
  await waitFor(() => expect(screen.queryByTestId('leave-1')).toBeNull());
  expect(screen.getByTestId('leave-2')).toBeTruthy();
  expect(screen.getByText('Ledighet godkänd för Elsa')).toBeTruthy();
});

test('Neka with a comment sends it and removes the request', async () => {
  await renderPage();
  await screen.findByTestId('leave-2');

  await fireEvent.press(card(2).getByRole('button', { name: 'Neka' }));
  expect(screen.getByText('Neka ledighet för Bo?')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Kommentar'), '  Viktig match  ');
  // The sheet's Neka is the last one on the screen.
  const nekaButtons = screen.getAllByRole('button', { name: 'Neka' });
  await fireEvent.press(nekaButtons[nekaButtons.length - 1]);

  expect(mockDeny).toHaveBeenCalledWith(2, 'Viktig match');
  await waitFor(() => expect(screen.queryByTestId('leave-2')).toBeNull());
  expect(screen.getByText('Begäran nekad')).toBeTruthy();
});

test('Neka without a comment sends no comment', async () => {
  await renderPage();
  await screen.findByTestId('leave-1');

  await fireEvent.press(card(1).getByRole('button', { name: 'Neka' }));
  const nekaButtons = screen.getAllByRole('button', { name: 'Neka' });
  await fireEvent.press(nekaButtons[nekaButtons.length - 1]);

  expect(mockDeny).toHaveBeenCalledWith(1, null);
  await waitFor(() => expect(screen.queryByTestId('leave-1')).toBeNull());
});

test('Avbryt closes the Neka sheet and sends nothing', async () => {
  await renderPage();
  await screen.findByTestId('leave-1');

  await fireEvent.press(card(1).getByRole('button', { name: 'Neka' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Avbryt' }));

  expect(mockDeny).not.toHaveBeenCalled();
  expect(screen.queryByText('Neka ledighet för Elsa?')).toBeNull();
  expect(screen.getByTestId('leave-1')).toBeTruthy();
});

test("an API error shows the server's message and keeps the request", async () => {
  mockApprove.mockRejectedValue(
    new Error('Närvarolistan är redan låst. Ledigheten kan inte godkännas.'),
  );
  await renderPage();
  await screen.findByTestId('leave-1');

  await fireEvent.press(card(1).getByRole('button', { name: 'Godkänn' }));

  expect(
    await screen.findByText('Närvarolistan är redan låst. Ledigheten kan inte godkännas.'),
  ).toBeTruthy();
  expect(screen.getByTestId('leave-1')).toBeTruthy();
});

test('an already answered request shows "Begäran är redan besvarad."', async () => {
  mockDeny.mockRejectedValue(new Error('Begäran är redan besvarad.'));
  await renderPage();
  await screen.findByTestId('leave-1');

  await fireEvent.press(card(1).getByRole('button', { name: 'Neka' }));
  const nekaButtons = screen.getAllByRole('button', { name: 'Neka' });
  await fireEvent.press(nekaButtons[nekaButtons.length - 1]);

  expect(await screen.findByText('Begäran är redan besvarad.')).toBeTruthy();
});

test('says so when nothing waits for an answer', async () => {
  mockList.mockResolvedValue([]);
  await renderPage();

  expect(await screen.findByText('Inga ledighetsbegäran väntar på svar')).toBeTruthy();
});

test('a failed load shows the error', async () => {
  mockList.mockRejectedValue(new Error('Den här funktionen är inte tillgänglig för din roll än.'));
  await renderPage();

  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});

test('pulling down loads the list again', async () => {
  await renderPage();
  await screen.findByTestId('leave-1');

  mockList.mockResolvedValue([]);
  await pullToRefresh();

  expect(await screen.findByText('Inga ledighetsbegäran väntar på svar')).toBeTruthy();
});
