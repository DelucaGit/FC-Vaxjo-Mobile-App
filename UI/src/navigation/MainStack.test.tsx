import { act } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MainStack from './MainStack';
import type { AppStackParamList } from './types';

const mockSession = {
  token: 'test-token',
  roleName: 'COACH',
  email: 'user@fcvaxjo.se',
  userId: 1,
  mustChangePassword: false,
};

const mockLogout = jest.fn(async () => {});

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: mockSession,
    loading: false,
    login: async () => {},
    changePassword: async () => {},
    logout: mockLogout,
  }),
}));

// Every API call the pages make answers with an empty list; this test is about navigation.
function mockApi() {
  return new Proxy(
    {},
    { get: (_, name) => (name === '__esModule' ? true : jest.fn(async () => [])) },
  );
}
jest.mock('../api/matches', () => mockApi());
jest.mock('../api/my', () => mockApi());
jest.mock('../api/teams', () => mockApi());
jest.mock('../api/trainings', () => mockApi());
jest.mock('../api/users', () => mockApi());

async function renderApp(roleName: string) {
  mockSession.roleName = roleName;
  const navigation = createNavigationContainerRef<AppStackParamList>();
  await render(
    <NavigationContainer ref={navigation}>
      <MainStack />
    </NavigationContainer>,
  );
  await waitFor(() => expect(navigation.isReady()).toBe(true));
  return navigation;
}

async function openMenu() {
  await fireEvent.press(screen.getByRole('button', { name: 'Öppna meny' }));
  expect(screen.getByTestId('menu')).toBeTruthy();
}

async function openProfileMenu() {
  await fireEvent.press(screen.getByRole('button', { name: 'Öppna profilmeny' }));
  expect(screen.getByTestId('profile-menu')).toBeTruthy();
}

/** Labels of the menu items, in order. */
function menuLabels(): string[] {
  return screen
    .getAllByRole('button')
    .filter((button) => button.props.accessibilityState?.selected !== undefined)
    .map((button) => button.props.accessibilityLabel as string);
}

describe('the menu', () => {
  test.each([
    ['PLAYER', 'Schedule', ['Schema', 'Tränare', 'Mina ledighetsbegäran', 'Tidigare aktiviteter'], 'Tränare', 'Coaches'],
    [
      'COACH',
      'Activities',
      ['Aktiviteter', 'Lag', 'Sök spelare', 'Tidigare aktiviteter'],
      'Sök spelare',
      'Search',
    ],
    [
      'ADMIN',
      'Activities',
      ['Aktiviteter', 'Lag', 'Användare', 'Ny användare', 'Tidigare aktiviteter'],
      'Användare',
      'Users',
    ],
  ])(
    '%s starts on %s, sees its pages and an item opens its page',
    async (roleName, start, labels, item, route) => {
      const navigation = await renderApp(roleName);
      expect(navigation.getCurrentRoute()?.name).toBe(start);

      // No tab bar any more.
      expect(screen.queryAllByTestId(/^tab-/)).toHaveLength(0);

      await openMenu();
      expect(menuLabels()).toEqual(labels);
      // The page you are on is marked.
      expect(screen.getByRole('button', { name: labels[0] }).props.accessibilityState).toEqual({
        selected: true,
      });

      await fireEvent.press(screen.getByRole('button', { name: item }));

      await waitFor(() => expect(navigation.getCurrentRoute()?.name).toBe(route));
      expect(screen.queryByTestId('menu')).toBeNull();
    },
  );

  test('pressing the dark layer closes the menu', async () => {
    const navigation = await renderApp('COACH');
    await openMenu();

    await fireEvent.press(screen.getByTestId('menu-scrim'));

    expect(screen.queryByTestId('menu')).toBeNull();
    expect(navigation.getCurrentRoute()?.name).toBe('Activities');
  });

  test('there is no "Mer" item any more', async () => {
    await renderApp('PLAYER');
    await openMenu();

    expect(screen.queryByRole('button', { name: 'Mer' })).toBeNull();
  });

  test('a pushed page shows the back arrow, not the menu button', async () => {
    const navigation = await renderApp('COACH');

    await act(async () => {
      navigation.navigate('ActivityDetail', { kind: 'match', id: 7 });
    });

    await waitFor(() => expect(navigation.getCurrentRoute()?.name).toBe('ActivityDetail'));
    expect(screen.getByRole('button', { name: 'Tillbaka' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Öppna meny' })).toBeNull();
    // The initials are on every page, also a pushed one.
    expect(screen.getByRole('button', { name: 'Öppna profilmeny' })).toBeTruthy();
  });

  test('an unknown role starts on a safe page and can still log out', async () => {
    mockLogout.mockClear();
    const navigation = await renderApp('SOMETHING_ELSE');
    expect(navigation.getCurrentRoute()?.name).toBe('PastActivities');

    await openProfileMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Logga ut' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test("a page from another role's menu cannot be opened", async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const navigation = await renderApp('COACH');

    await act(async () => {
      navigation.navigate('Users');
    });

    expect(navigation.getCurrentRoute()?.name).toBe('Activities');
    error.mockRestore();
  });
});

describe('the profile menu', () => {
  test('the initials on the first page open it, with the e-mail when the name is unknown', async () => {
    await renderApp('COACH');

    // The API mock has no name, so the e-mail stands in: "user@…" → "U".
    expect(screen.getByRole('button', { name: 'Öppna profilmeny' })).toHaveTextContent('U');
    await openProfileMenu();

    expect(screen.getByText('user@fcvaxjo.se')).toBeTruthy();
    expect(screen.getByText('Tränare')).toBeTruthy();
  });

  test('"Byt lösenord" opens the change-password screen', async () => {
    const navigation = await renderApp('PLAYER');
    await openProfileMenu();

    await fireEvent.press(screen.getByRole('button', { name: 'Byt lösenord' }));

    await waitFor(() => expect(navigation.getCurrentRoute()?.name).toBe('ChangePassword'));
    expect(screen.queryByTestId('profile-menu')).toBeNull();
  });

  test('"Logga ut" logs out', async () => {
    mockLogout.mockClear();
    await renderApp('ADMIN');
    await openProfileMenu();

    await fireEvent.press(screen.getByRole('button', { name: 'Logga ut' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-menu')).toBeNull();
  });

  test('pressing the dark layer closes it', async () => {
    await renderApp('COACH');
    await openProfileMenu();

    await fireEvent.press(screen.getByTestId('profile-menu-scrim'));

    expect(screen.queryByTestId('profile-menu')).toBeNull();
  });

  test('the menu and the profile menu are never open at the same time', async () => {
    await renderApp('COACH');

    await openMenu();
    await openProfileMenu();
    expect(screen.queryByTestId('menu')).toBeNull();

    await openMenu();
    expect(screen.queryByTestId('profile-menu')).toBeNull();
  });
});
