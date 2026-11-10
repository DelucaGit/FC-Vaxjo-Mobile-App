import type { ComponentType } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import {
  CalendarDays,
  Contact,
  Menu,
  Search,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';
import { colors, sizes, type } from '../theme';
import {
  ActivitiesStack,
  CoachesStack,
  MoreStack,
  ScheduleStack,
  SearchStack,
  SquadStack,
  TeamsStack,
  UsersStack,
} from './stacks';
import { tabsForRole } from './tabsForRole';
import type { TabName, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/** Label, icon and stack for each tab (spec section 8). */
const TABS: Record<TabName, { label: string; icon: LucideIcon; stack: ComponentType }> = {
  ScheduleTab: { label: 'Schema', icon: CalendarDays, stack: ScheduleStack },
  CoachesTab: { label: 'Tränare', icon: Contact, stack: CoachesStack },
  ActivitiesTab: { label: 'Aktiviteter', icon: CalendarDays, stack: ActivitiesStack },
  SquadTab: { label: 'Laget', icon: Users, stack: SquadStack },
  SearchTab: { label: 'Sök', icon: Search, stack: SearchStack },
  TeamsTab: { label: 'Lag', icon: Shield, stack: TeamsStack },
  UsersTab: { label: 'Användare', icon: UserRound, stack: UsersStack },
  MoreTab: { label: 'Mer', icon: Menu, stack: MoreStack },
};

/**
 * The bottom menu. Only the tabs for the signed-in role are registered,
 * so a route from another role's tab cannot be opened at all.
 */
export default function MainTabs() {
  const { session } = useAuth();
  const tabs = tabsForRole(session?.roleName);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: sizes.divider,
          borderTopColor: colors.border,
          minHeight: sizes.tabBar,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {tabs.map((name) => {
        const { label, icon: Icon, stack } = TABS[name];
        return (
          <Tab.Screen
            key={name}
            name={name}
            component={stack}
            options={{
              title: label,
              tabBarButtonTestID: `tab-${name}`,
              tabBarAccessibilityLabel: label,
              tabBarIcon: ({ focused, color }) => (
                <Icon size={sizes.icon} color={color} strokeWidth={focused ? 2 : 1.5} />
              ),
              tabBarLabel: ({ color }) => <Text style={[type.tab, { color }]}>{label}</Text>,
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
}
