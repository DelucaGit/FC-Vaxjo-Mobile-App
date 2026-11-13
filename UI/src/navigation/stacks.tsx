import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import AddCoachScreen from '../screens/AddCoachScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import CancelMatchScreen from '../screens/CancelMatchScreen';
import CancelTrainingScreen from '../screens/CancelTrainingScreen';
import CoachesScreen from '../screens/CoachesScreen';
import EditMatchScreen from '../screens/EditMatchScreen';
import EditTrainingScreen from '../screens/EditTrainingScreen';
import MoreChangePasswordScreen from '../screens/MoreChangePasswordScreen';
import MoreScreen from '../screens/MoreScreen';
import NewMatchScreen from '../screens/NewMatchScreen';
import NewPlayerScreen from '../screens/NewPlayerScreen';
import NewTeamScreen from '../screens/NewTeamScreen';
import NewTrainingScreen from '../screens/NewTrainingScreen';
import NewUserScreen from '../screens/NewUserScreen';
import PastActivitiesScreen from '../screens/PastActivitiesScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import PlayerViewScreen from '../screens/PlayerViewScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SearchScreen from '../screens/SearchScreen';
import SetResultScreen from '../screens/SetResultScreen';
import SquadScreen from '../screens/SquadScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import TeamsScreen from '../screens/TeamsScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import UsersScreen from '../screens/UsersScreen';
import { colors } from '../theme';
import type { AppStackParamList } from './types';

/**
 * One native stack per tab. They share one route list (AppStackParamList),
 * but each registers only what can be reached from that tab.
 * The header is drawn by our own Screen component, so the stack header is off.
 *
 * The native stack pops to its first screen by itself when its (already active)
 * tab is pressed again, which is what spec section 8 asks for.
 */
const Stack = createNativeStackNavigator<AppStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

export function ScheduleStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
    </Stack.Navigator>
  );
}

export function CoachesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Coaches" component={CoachesScreen} />
    </Stack.Navigator>
  );
}

export function ActivitiesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Activities" component={ActivitiesScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="NewTraining" component={NewTrainingScreen} />
      <Stack.Screen name="EditTraining" component={EditTrainingScreen} />
      <Stack.Screen name="EditMatch" component={EditMatchScreen} />
      <Stack.Screen name="NewMatch" component={NewMatchScreen} />
      <Stack.Screen name="CancelTraining" component={CancelTrainingScreen} />
      <Stack.Screen name="CancelMatch" component={CancelMatchScreen} />
      <Stack.Screen name="SetResult" component={SetResultScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
    </Stack.Navigator>
  );
}

export function SquadStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Squad" component={SquadScreen} />
      <Stack.Screen name="PlayerView" component={PlayerViewScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <Stack.Screen name="NewPlayer" component={NewPlayerScreen} />
    </Stack.Navigator>
  );
}

export function SearchStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="PlayerView" component={PlayerViewScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
    </Stack.Navigator>
  );
}

export function TeamsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Teams" component={TeamsScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="PlayerView" component={PlayerViewScreen} />
      <Stack.Screen name="NewTeam" component={NewTeamScreen} />
      <Stack.Screen name="AddCoach" component={AddCoachScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <Stack.Screen name="NewPlayer" component={NewPlayerScreen} />
    </Stack.Navigator>
  );
}

export function UsersStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} />
      <Stack.Screen name="NewUser" component={NewUserScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
    </Stack.Navigator>
  );
}

export function MoreStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="ChangePassword" component={MoreChangePasswordScreen} />
      <Stack.Screen name="PastActivities" component={PastActivitiesScreen} />
      {/* The detail view and the screens it opens, so a past activity works like on "Aktiviteter". */}
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="EditTraining" component={EditTrainingScreen} />
      <Stack.Screen name="EditMatch" component={EditMatchScreen} />
      <Stack.Screen name="CancelTraining" component={CancelTrainingScreen} />
      <Stack.Screen name="CancelMatch" component={CancelMatchScreen} />
      <Stack.Screen name="SetResult" component={SetResultScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
    </Stack.Navigator>
  );
}
