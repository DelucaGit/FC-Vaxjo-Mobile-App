import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import CreateUserScreen from './src/screens/CreateUserScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MoreScreen from './src/screens/MoreScreen';
import MyScheduleScreen from './src/screens/MyScheduleScreen';
import SearchScreen from './src/screens/SearchScreen';
import TeamsScreen from './src/screens/TeamsScreen';
import TrainingsScreen from './src/screens/TrainingsScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

function TabLabel({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
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

function MainTabs() {
  const { session } = useAuth();
  const isStaff = session?.roleName === 'ADMIN' || session?.roleName === 'COACH';

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
        component={isStaff ? TrainingsScreen : MyScheduleScreen}
        options={{
          title: isStaff ? 'Närvaro' : 'Schema',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Schema" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Laget"
        component={TeamsScreen}
        options={{
          title: 'Laget',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Laget" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Mer"
        component={MoreScreen}
        options={{
          title: 'Mer',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Mer" focused={focused} />
          ),
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
      {isStaff ? (
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
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (session.mustChangePassword) {
    return <ChangePasswordScreen />;
  }

  return <MainTabs />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
