import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { apiFetch } from '../api/http';
import TrainingsScreen from './TrainingsScreen';

// One session object. A new object on every useAuth() call retriggers focus.
const mockSession = {
  token: 'test-token',
  roleName: 'CHAIRMAN',
  email: 'ordf@fcvaxjo.se',
  userId: 3,
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

describe('TrainingsScreen 403', () => {
  test('chairman still sees the screen and a clear message when the API refuses', async () => {
    mockedFetch.mockImplementation(async (url: string) => {
      if (url.includes('/trainings')) {
        return new Response(JSON.stringify({ message: 'Access Denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([{ id: 1, name: 'P15' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await render(
      <NavigationContainer>
        <TrainingsScreen />
      </NavigationContainer>,
    );

    expect(
      await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
    ).toBeTruthy();
    expect(screen.getByText('Skapa träning')).toBeTruthy();
    expect(screen.getByText('P15')).toBeTruthy();
  });
});
