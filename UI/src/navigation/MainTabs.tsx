import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { canCreateTeam, isStaff } from '../auth/roles';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import CreateUserScreen from '../screens/CreateUserScreen';
import HomeScreen from '../screens/HomeScreen';
import MoreScreen from '../screens/MoreScreen';
import MyScheduleScreen from '../screens/MyScheduleScreen';
import SearchScreen from '../screens/SearchScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TrainingsScreen from '../screens/TrainingsScreen';
import { colors } from '../theme/colors';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? '700' : '600',
        color: focused ? colors.primary : colors.onSurfaceVariant,
        marginBottom: 2,
      }}
    >
      {label}
    </Text>
  );
}

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55, marginTop: 4 }}>
      {icon}
    </Text>
  );
}

export default function MainTabs() {
  const { session } = useAuth();
  // Chairman is above coach, so staff screens stay open for CHAIRMAN.
  const staff = isStaff(session?.roleName);
  // The create-team route itself is omitted for a coach, so navigate() cannot open it.
  const mayCreateTeam = canCreateTeam(session?.roleName);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.outlineVariant,
          height: 64,
          paddingTop: 4,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'FC Växjö',
          headerShown: false,
          tabBarLabel: ({ focused }) => <TabLabel label="Hem" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Schema"
        component={staff ? TrainingsScreen : MyScheduleScreen}
        options={{
          title: staff ? 'Närvaro' : 'Schema',
          tabBarLabel: ({ focused }) => <TabLabel label="Schema" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Laget"
        component={TeamsScreen}
        options={{
          title: 'Laget',
          tabBarLabel: ({ focused }) => <TabLabel label="Laget" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Mer"
        component={MoreScreen}
        options={{
          title: 'Mer',
          tabBarLabel: ({ focused }) => <TabLabel label="Mer" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon icon="☰" focused={focused} />,
        }}
      />
      {/* Hidden routes opened from Mer / Home quick actions */}
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Sök',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      {staff ? (
        <Tab.Screen
          name="Create"
          component={CreateUserScreen}
          options={{
            title: 'Skapa',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      ) : null}
      {mayCreateTeam ? (
        <Tab.Screen
          name="CreateTeam"
          component={CreateTeamScreen}
          options={{
            title: 'Skapa lag',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
}
