import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { LeaveRequest } from '../api/leaveRequests';
import { listMyLeaveRequests, withdrawLeaveRequest } from '../api/leaveRequests';
import type { MyChild } from '../api/my';
import { listMyChildren } from '../api/my';
import { ToastProvider } from '../components/ui';
import MyLeaveRequestsScreen from './MyLeaveRequestsScreen';

const mockSession = { roleName: 'PLAYER', userId: 7 };

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

jest.mock('../api/my', () => ({ listMyChildren: jest.fn() }));

jest.mock('../api/leaveRequests', () => ({
  listMyLeaveRequests: jest.fn(),
  withdrawLeaveRequest: jest.fn(),
}));

// The page reloads on focus; in a test "focus" is simply the first render.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const mockList = listMyLeaveRequests as jest.MockedFunction<typeof listMyLeaveRequests>;
const mockWithdraw = withdrawLeaveRequest as jest.MockedFunction<typeof withdrawLeaveRequest>;
const mockChildren = listMyChildren as jest.MockedFunction<typeof listMyChildren>;

function request(overrides: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 1,
    playerUserId: 7,
    activityKind: 'TRAINING',
    activityId: 10,
    activityStart: '2026-11-24T17:30:00',
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
      <MyLeaveRequestsScreen />
    </ToastProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.roleName = 'PLAYER';
});

test('a player sees the activity, the orsak and the status of each request', async () => {
  mockList.mockResolvedValue([
    request({ id: 1 }),
    request({
      id: 2,
      activityKind: 'MATCH',
      reasonType: 'OTHER',
      reasonText: 'Kalas hos mormor',
      status: 'APPROVED',
    }),
  ]);

  await renderPage();

  const pending = await screen.findByTestId('leave-1');
  expect(within(pending).getByText('Träning · P12 Alfa')).toBeTruthy();
  expect(within(pending).getByText('Orsak: Sjuk')).toBeTruthy();
  expect(within(pending).getByText('Väntar på svar')).toBeTruthy();
  const approved = screen.getByTestId('leave-2');
  expect(within(approved).getByText('Match · P12 Alfa')).toBeTruthy();
  expect(within(approved).getByText('Orsak: Annat – Kalas hos mormor')).toBeTruthy();
  expect(within(approved).getByText('Godkänd')).toBeTruthy();
  // A player must not send childId.
  expect(mockList).toHaveBeenCalledWith(undefined);
});

test('a denied request shows the coach comment when there is one', async () => {
  mockList.mockResolvedValue([
    request({ id: 1, status: 'DENIED', coachNote: 'Viktig match, kom om du kan' }),
    request({ id: 2, status: 'DENIED', coachNote: null }),
  ]);

  await renderPage();

  const withNote = await screen.findByTestId('leave-1');
  expect(within(withNote).getByText('Nekad')).toBeTruthy();
  expect(within(withNote).getByText('Tränaren: Viktig match, kom om du kan')).toBeTruthy();
  const withoutNote = screen.getByTestId('leave-2');
  expect(within(withoutNote).getByText('Nekad')).toBeTruthy();
  expect(within(withoutNote).queryByText(/Tränaren:/)).toBeNull();
});

test('only a request that is Väntar på svar can be withdrawn', async () => {
  mockList.mockResolvedValue([
    request({ id: 1, status: 'PENDING' }),
    request({ id: 2, status: 'APPROVED' }),
    request({ id: 3, status: 'DENIED' }),
  ]);

  await renderPage();

  expect(within(await screen.findByTestId('leave-1')).getByText('Dra tillbaka')).toBeTruthy();
  expect(within(screen.getByTestId('leave-2')).queryByText('Dra tillbaka')).toBeNull();
  expect(within(screen.getByTestId('leave-3')).queryByText('Dra tillbaka')).toBeNull();
});

test('withdrawing asks first, then removes the request from the list', async () => {
  mockList.mockResolvedValue([request({ id: 1 }), request({ id: 2, status: 'APPROVED' })]);
  mockWithdraw.mockResolvedValue();

  await renderPage();

  await fireEvent.press(within(await screen.findByTestId('leave-1')).getByText('Dra tillbaka'));
  expect(screen.getByText('Dra tillbaka begäran?')).toBeTruthy();
  expect(mockWithdraw).not.toHaveBeenCalled();

  // The confirm button is the last "Dra tillbaka" (the row button is the first).
  const buttons = screen.getAllByRole('button', { name: 'Dra tillbaka' });
  await fireEvent.press(buttons[buttons.length - 1]);

  expect(mockWithdraw).toHaveBeenCalledWith(1);
  expect(await screen.findByText('Begäran är tillbakadragen')).toBeTruthy();
  expect(screen.queryByTestId('leave-1')).toBeNull();
  expect(screen.getByTestId('leave-2')).toBeTruthy();
});

test('Avbryt keeps the request', async () => {
  mockList.mockResolvedValue([request({ id: 1 })]);

  await renderPage();

  await fireEvent.press(within(await screen.findByTestId('leave-1')).getByText('Dra tillbaka'));
  await fireEvent.press(screen.getByRole('button', { name: 'Avbryt' }));

  expect(mockWithdraw).not.toHaveBeenCalled();
  expect(screen.getByTestId('leave-1')).toBeTruthy();
});

test('a failed withdraw shows the error and keeps the request', async () => {
  mockList.mockResolvedValue([request({ id: 1 })]);
  mockWithdraw.mockRejectedValue(new Error('Begäran är redan besvarad.'));

  await renderPage();

  await fireEvent.press(within(await screen.findByTestId('leave-1')).getByText('Dra tillbaka'));
  const buttons = screen.getAllByRole('button', { name: 'Dra tillbaka' });
  await fireEvent.press(buttons[buttons.length - 1]);

  expect(await screen.findByText('Begäran är redan besvarad.')).toBeTruthy();
  expect(screen.getByTestId('leave-1')).toBeTruthy();
});

test('an empty list shows an empty message', async () => {
  mockList.mockResolvedValue([]);

  await renderPage();

  expect(await screen.findByText('Inga ledighetsbegäran')).toBeTruthy();
});

test('a parent sees the selected child and switches child', async () => {
  mockSession.roleName = 'PARENT';
  const children: MyChild[] = [
    { id: 11, name: 'Elsa Lind', teamId: 1, teamName: 'P12 Alfa' },
    { id: 12, name: 'Noah Lind', teamId: 2, teamName: 'P14 Beta' },
  ];
  mockChildren.mockResolvedValue(children);
  mockList.mockImplementation(async (childId) =>
    childId === 12
      ? [request({ id: 5, playerUserId: 12, teamName: 'P14 Beta' })]
      : [request({ id: 4, playerUserId: 11 })],
  );

  await renderPage();

  expect(await screen.findByTestId('leave-4')).toBeTruthy();
  expect(mockList).toHaveBeenCalledWith(11);

  await fireEvent.press(screen.getByText('Noah'));

  expect(await screen.findByText('Träning · P14 Beta')).toBeTruthy();
  expect(screen.queryByTestId('leave-4')).toBeNull();
  expect(mockList).toHaveBeenLastCalledWith(12);
});

test('shows the Swedish error message from the API', async () => {
  mockList.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));

  await renderPage();

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
});
