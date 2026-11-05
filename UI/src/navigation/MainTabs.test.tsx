import { act } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import MainTabs from './MainTabs';
import type { TabParamList } from './types';

// One session object. A new object on every useAuth() call would
// retrigger HomeScreen's focus effect forever.
const mockSession = {
  token: 'test-token',
  roleName: 'COACH',
  email: 'user@fcvaxjo.se',
  userId: 1,
  mustChangePassword: false,
};

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: mockSession,
    loading: false,
    login: async () => {},
    changePassword: async () => {},
    logout: async () => {},
  }),
}));

jest.mock('../api/teams', () => ({
  listTeams: jest.fn(async () => [{ id: 1, name: 'P15' }]),
  listMyTeams: jest.fn(async () => [{ id: 1, name: 'P15' }]),
  createTeam: jest.fn(async (name: string) => ({ id: 9, name })),
  listTeamCoaches: jest.fn(async () => []),
  listTeamPlayers: jest.fn(async () => []),
  addTeamCoach: jest.fn(),
  removeTeamCoach: jest.fn(),
}));

jest.mock('../api/users', () => ({
  getUserById: jest.fn(async () => ({
    id: 1,
    name: 'Test Person',
    email: 'user@fcvaxjo.se',
    roleName: mockSession.roleName,
    playerNumber: null,
    mobilePhoneNumber: null,
    parentId: null,
    parentName: null,
    parentEmail: null,
    parentMobilePhoneNumber: null,
    teamId: null,
    teamName: null,
    active: true,
  })),
  searchByName: jest.fn(async () => []),
  createUser: jest.fn(),
  updatePlayer: jest.fn(),
  softDeletePlayer: jest.fn(),
}));

jest.mock('../api/trainings', () => ({
  listTrainings: jest.fn(async () => []),
  createTraining: jest.fn(),
  listAttendance: jest.fn(async () => []),
  updateAttendance: jest.fn(),
}));

jest.mock('../api/mySchedule', () => ({
  listMyChildren: jest.fn(async () => []),
  listMyTrainings: jest.fn(async () => []),
}));

async function openTeamList(roleName: string) {
  mockSession.roleName = roleName;
  const navigation = createNavigationContainerRef<TabParamList>();
  await render(
    <NavigationContainer ref={navigation}>
      <MainTabs />
    </NavigationContainer>,
  );
  await waitFor(() => {
    expect(navigation.isReady()).toBe(true);
  });
  await act(async () => {
    navigation.navigate('Laget');
  });
  expect(await screen.findByText('Välj ett lag för att öppna roster.')).toBeTruthy();
  return navigation;
}

describe('Skapa lag', () => {
  test.each(['ADMIN', 'CHAIRMAN'])(
    'shows the button for %s and opens the screen',
    async (roleName) => {
      const navigation = await openTeamList(roleName);

      fireEvent.press(screen.getByText('Skapa lag'));

      expect(await screen.findByPlaceholderText('P15')).toBeTruthy();
      expect(navigation.getCurrentRoute()?.name).toBe('CreateTeam');
    },
  );

  test.each(['COACH', 'PLAYER', 'PARENT'])(
    'hides the button for %s and does not open the screen from navigation',
    async (roleName) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      const navigation = await openTeamList(roleName);

      expect(screen.queryByText('Skapa lag')).toBeNull();
      expect(screen.queryByPlaceholderText('P15')).toBeNull();

      await act(async () => {
        navigation.navigate('CreateTeam');
      });

      expect(navigation.getCurrentRoute()?.name).toBe('Laget');
      expect(screen.queryByPlaceholderText('P15')).toBeNull();
      expect(screen.queryByText('Skapa lag')).toBeNull();

      warn.mockRestore();
      error.mockRestore();
    },
  );
});
