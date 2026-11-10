import { act } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MainTabs from './MainTabs';
import type { TabParamList } from './types';

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

async function renderTabs(roleName: string) {
  mockSession.roleName = roleName;
  const navigation = createNavigationContainerRef<TabParamList>();
  await render(
    <NavigationContainer ref={navigation}>
      <MainTabs />
    </NavigationContainer>,
  );
  await waitFor(() => expect(navigation.isReady()).toBe(true));
  return navigation;
}

/** Tab labels in the order they are shown. */
function tabLabels(): string[] {
  return screen
    .getAllByTestId(/^tab-/)
    .map((tab) => tab.props.accessibilityLabel as string);
}

describe('tabs per role', () => {
  test.each([
    ['PLAYER', ['Schema', 'Tränare', 'Mer']],
    ['PARENT', ['Schema', 'Tränare', 'Mer']],
    ['COACH', ['Aktiviteter', 'Laget', 'Sök', 'Mer']],
    ['CHAIRMAN', ['Aktiviteter', 'Lag', 'Användare', 'Mer']],
    ['ADMIN', ['Aktiviteter', 'Lag', 'Användare', 'Mer']],
  ])('%s sees %j', async (roleName, expected) => {
    await renderTabs(roleName);

    expect(tabLabels()).toEqual(expected);
  });

  test('an unknown role only gets "Mer"', async () => {
    await renderTabs('SOMETHING_ELSE');

    expect(tabLabels()).toEqual(['Mer']);
  });
});

describe('tab stacks', () => {
  test('pressing the active tab pops its stack back to the top', async () => {
    const navigation = await renderTabs('COACH');

    await act(async () => {
      navigation.navigate('ActivitiesTab', {
        screen: 'ActivityDetail',
        params: { kind: 'match', id: 7 },
      });
    });
    expect(navigation.getCurrentRoute()?.name).toBe('ActivityDetail');

    await fireEvent.press(screen.getByTestId('tab-ActivitiesTab'));

    await waitFor(() => expect(navigation.getCurrentRoute()?.name).toBe('Activities'));
  });

  test("a route from another role's tab cannot be opened", async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const navigation = await renderTabs('COACH');

    await act(async () => {
      navigation.navigate('UsersTab', { screen: 'Users' });
    });

    expect(navigation.getCurrentRoute()?.name).toBe('Activities');
    error.mockRestore();
  });
});
