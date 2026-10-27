import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import CreateUserScreen from './src/screens/CreateUserScreen';
import SearchScreen from './src/screens/SearchScreen';
import TeamsScreen from './src/screens/TeamsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1b4332' },
          headerTintColor: '#fff',
          tabBarActiveTintColor: '#1b4332',
        }}
      >
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'FC Växjö — Search' }}
        />
        <Tab.Screen
          name="Create"
          component={CreateUserScreen}
          options={{ title: 'FC Växjö — Create' }}
        />
        <Tab.Screen
          name="Teams"
          component={TeamsScreen}
          options={{ title: 'FC Växjö — Teams' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
