import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import CreateUserScreen from './src/screens/CreateUserScreen';
import LoginScreen from './src/screens/LoginScreen';
import SearchScreen from './src/screens/SearchScreen';
import TeamsScreen from './src/screens/TeamsScreen';
import TrainingsScreen from './src/screens/TrainingsScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { session, logout } = useAuth();
  const isStaff = session?.roleName === 'ADMIN' || session?.roleName === 'COACH';

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1b4332' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#1b4332',
        headerRight: () => (
          <Pressable onPress={() => logout()} style={styles.logout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        ),
      }}
    >
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'FC Växjö — Search' }}
      />
      {isStaff ? (
        <Tab.Screen
          name="Create"
          component={CreateUserScreen}
          options={{ title: 'FC Växjö — Create' }}
        />
      ) : null}
      <Tab.Screen
        name="Teams"
        component={TeamsScreen}
        options={{ title: 'FC Växjö — Teams' }}
      />
      {isStaff ? (
        <Tab.Screen
          name="Trainings"
          component={TrainingsScreen}
          options={{ title: 'FC Växjö — Trainings' }}
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
        <ActivityIndicator size="large" color="#1b4332" />
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
        <StatusBar style="dark" />
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
    backgroundColor: '#f8f9fa',
  },
  logout: {
    marginRight: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
