import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { MyChild, MyCoach } from '../api/my';
import { listMyChildren, listMyCoaches } from '../api/my';
import type { ClubUser } from '../api/users';
import { getUserById } from '../api/users';
import CoachesScreen from './CoachesScreen';

const mockSession = { roleName: 'PLAYER', userId: 7 };

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

jest.mock('../api/my', () => ({
  listMyChildren: jest.fn(),
  listMyCoaches: jest.fn(),
}));

jest.mock('../api/users', () => ({
  getUserById: jest.fn(),
}));

const mockChildren = listMyChildren as jest.MockedFunction<typeof listMyChildren>;
const mockCoaches = listMyCoaches as jest.MockedFunction<typeof listMyCoaches>;
const mockGetUser = getUserById as jest.MockedFunction<typeof getUserById>;

const johan: MyCoach = {
  id: 3,
  name: 'Johan Berg',
  email: 'johan@fcvaxjo.se',
  mobilePhoneNumber: '070-123 45 67',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.roleName = 'PLAYER';
  mockGetUser.mockResolvedValue({ teamName: 'P12 Alfa' } as ClubUser);
});

test('a player sees the team name and the coach with phone and e-mail links', async () => {
  mockCoaches.mockResolvedValue([johan]);
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

  await render(<CoachesScreen />);

  expect(await screen.findByText('P12 Alfa')).toBeTruthy();
  const row = screen.getByTestId('coach-3');
  expect(within(row).getByText('Johan Berg')).toBeTruthy();
  await fireEvent.press(within(row).getByLabelText('Ring 070-123 45 67'));
  expect(openURL).toHaveBeenCalledWith('tel:0701234567');
  await fireEvent.press(within(row).getByLabelText('Mejla johan@fcvaxjo.se'));
  expect(openURL).toHaveBeenCalledWith('mailto:johan@fcvaxjo.se');
  // A player must not send childId.
  expect(mockCoaches).toHaveBeenCalledWith(undefined);
  expect(mockGetUser).toHaveBeenCalledWith(7);
  openURL.mockRestore();
});

test('shows "Inga tränare" when the team has no coach', async () => {
  mockCoaches.mockResolvedValue([]);

  await render(<CoachesScreen />);

  expect(await screen.findByText('Inga tränare')).toBeTruthy();
});

test('a parent switches child and sees that team and its coaches', async () => {
  mockSession.roleName = 'PARENT';
  const children: MyChild[] = [
    { id: 11, name: 'Elsa Lind', teamId: 1, teamName: 'P12 Alfa' },
    { id: 12, name: 'Noah Lind', teamId: 2, teamName: 'P14 Beta' },
  ];
  mockChildren.mockResolvedValue(children);
  mockCoaches.mockImplementation(async (childId) =>
    childId === 12 ? [{ ...johan, id: 4, name: 'Sara Ek' }] : [johan],
  );

  await render(<CoachesScreen />);

  expect(await screen.findByText('Johan Berg')).toBeTruthy();
  expect(screen.getByText('P12 Alfa')).toBeTruthy();
  expect(mockCoaches).toHaveBeenCalledWith(11);

  await fireEvent.press(screen.getByText('Noah'));

  expect(await screen.findByText('Sara Ek')).toBeTruthy();
  expect(screen.getByText('P14 Beta')).toBeTruthy();
  expect(mockCoaches).toHaveBeenLastCalledWith(12);
  // The parent's team name comes from the child, not from GET /users/{id}.
  expect(mockGetUser).not.toHaveBeenCalled();
});

test('shows the Swedish error message from the API', async () => {
  mockCoaches.mockRejectedValue(new Error('Du har inte behörighet att göra detta.'));

  await render(<CoachesScreen />);

  expect(await screen.findByText('Du har inte behörighet att göra detta.')).toBeTruthy();
});
