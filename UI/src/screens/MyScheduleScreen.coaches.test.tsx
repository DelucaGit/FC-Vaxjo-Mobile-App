import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { apiFetch } from '../api/http';
import MyScheduleScreen from './MyScheduleScreen';

// One session object. A new object on every useAuth() call retriggers focus.
const mockSession = {
  token: 'test-token',
  roleName: 'PARENT',
  email: 'parent@fcvaxjo.se',
  userId: 7,
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

jest.mock('../api/http', () => {
  const actual = jest.requireActual('../api/http');
  return {
    ...actual,
    apiFetch: jest.fn(),
  };
});

const mockedFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('parent sees the coaches of the selected child and they reload on switch', async () => {
  mockedFetch.mockImplementation(async (url: string) => {
    if (url.includes('/my/children')) {
      return json([
        { id: 10, name: 'Elsa', teamId: 1, teamName: 'P15' },
        { id: 11, name: 'Olle', teamId: 2, teamName: 'P12' },
      ]);
    }
    if (url.includes('/my/coaches?childId=10')) {
      return json([{ id: 1, name: 'Coach Elsa', email: null, mobilePhoneNumber: null }]);
    }
    if (url.includes('/my/coaches?childId=11')) {
      return json([{ id: 2, name: 'Coach Olle', email: null, mobilePhoneNumber: null }]);
    }
    return json([]);
  });

  await render(
    <NavigationContainer>
      <MyScheduleScreen />
    </NavigationContainer>,
  );

  expect(await screen.findByText('Coach Elsa')).toBeTruthy();

  await fireEvent.press(screen.getByText('Olle (P12)'));

  expect(await screen.findByText('Coach Olle')).toBeTruthy();
  expect(screen.queryByText('Coach Elsa')).toBeNull();
});
