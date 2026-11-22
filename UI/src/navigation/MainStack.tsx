import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
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
import MyLeaveRequestsScreen from '../screens/MyLeaveRequestsScreen';
import NewMatchScreen from '../screens/NewMatchScreen';
import NewPlayerScreen from '../screens/NewPlayerScreen';
import NewTeamScreen from '../screens/NewTeamScreen';
import NewTrainingScreen from '../screens/NewTrainingScreen';
import NewUserScreen from '../screens/NewUserScreen';
import PastActivitiesScreen from '../screens/PastActivitiesScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import PlayerViewScreen from '../screens/PlayerViewScreen';
import RequestLeaveScreen from '../screens/RequestLeaveScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SearchScreen from '../screens/SearchScreen';
import SetResultScreen from '../screens/SetResultScreen';
import SquadScreen from '../screens/SquadScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import TeamsScreen from '../screens/TeamsScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import UsersScreen from '../screens/UsersScreen';
import { colors } from '../theme';
import { MenuLayout, MenuScreenLayout } from './Menu';
import { menuForRole } from './menuForRole';
import type { AppStackParamList } from './types';

type RouteName = keyof AppStackParamList;

const Stack = createNativeStackNavigator<AppStackParamList>();

const SCREENS: Record<RouteName, ComponentType<any>> = {
  Schedule: ScheduleScreen,
  Coaches: CoachesScreen,
  RequestLeave: RequestLeaveScreen,
  MyLeaveRequests: MyLeaveRequestsScreen,
  Activities: ActivitiesScreen,
  ActivityDetail: ActivityDetailScreen,
  NewTraining: NewTrainingScreen,
  EditTraining: EditTrainingScreen,
  NewMatch: NewMatchScreen,
  EditMatch: EditMatchScreen,
  CancelTraining: CancelTrainingScreen,
  CancelMatch: CancelMatchScreen,
  SetResult: SetResultScreen,
  Attendance: AttendanceScreen,
  Squad: SquadScreen,
  Teams: TeamsScreen,
  TeamDetail: TeamDetailScreen,
  NewTeam: NewTeamScreen,
  AddCoach: AddCoachScreen,
  PlayerView: PlayerViewScreen,
  PlayerProfile: PlayerProfileScreen,
  NewPlayer: NewPlayerScreen,
  Search: SearchScreen,
  Users: UsersScreen,
  UserDetail: UserDetailScreen,
  NewUser: NewUserScreen,
  ChangePassword: MoreChangePasswordScreen,
  PastActivities: PastActivitiesScreen,
};

// The same groups of screens as the old tab stacks, so each role reaches what it did before.
const ACTIVITY_ACTIONS: readonly RouteName[] = [
  'ActivityDetail',
  'EditTraining',
  'EditMatch',
  'CancelTraining',
  'CancelMatch',
  'SetResult',
  'Attendance',
];
/** "Byt lösenord" (from the profile menu) and "Tidigare aktiviteter": every role. */
const EVERY_ROLE: readonly RouteName[] = ['ChangePassword', 'PastActivities', ...ACTIVITY_ACTIONS];
const ACTIVITIES: readonly RouteName[] = ['Activities', 'NewTraining', 'NewMatch', ...ACTIVITY_ACTIONS];
const SQUAD: readonly RouteName[] = ['Squad', 'PlayerView', 'PlayerProfile', 'NewPlayer'];
const SEARCH: readonly RouteName[] = ['Search', 'PlayerView', 'PlayerProfile'];
const TEAMS: readonly RouteName[] = [
  'Teams',
  'TeamDetail',
  'PlayerView',
  'NewTeam',
  'AddCoach',
  'PlayerProfile',
  'NewPlayer',
];
const USERS: readonly RouteName[] = ['Users', 'UserDetail', 'NewUser', 'PlayerProfile'];

/**
 * Every route the role may open. Routes outside the list are not registered,
 * so a page from another role cannot be opened at all.
 */
export function routesForRole(roleName: string | null | undefined): readonly RouteName[] {
  let groups: (readonly RouteName[])[];
  switch (roleName) {
    case 'PLAYER':
    case 'PARENT':
      groups = [['Schedule', 'Coaches', 'RequestLeave', 'MyLeaveRequests'], EVERY_ROLE];
      break;
    case 'COACH':
      groups = [ACTIVITIES, SQUAD, SEARCH, EVERY_ROLE];
      break;
    case 'CHAIRMAN':
    case 'ADMIN':
      groups = [ACTIVITIES, TEAMS, USERS, EVERY_ROLE];
      break;
    default:
      groups = [EVERY_ROLE];
  }
  return [...new Set(groups.flat())];
}

/**
 * The signed-in part of the app: one stack with every page the role may use.
 * The first menu item is the start page. The header is drawn by our own Screen
 * component (with the menu button), so the stack header is off.
 */
export default function MainStack() {
  const { session } = useAuth();
  const roleName = session?.roleName;
  const routes = routesForRole(roleName);
  // An unknown role has an empty menu: it starts on a page every role has, and can
  // still log out from the profile menu.
  const initialRouteName = menuForRole(roleName)[0]?.route ?? 'PastActivities';

  return (
    <Stack.Navigator
      // A new role means a new set of pages, so start the stack over.
      key={roleName ?? 'none'}
      initialRouteName={initialRouteName}
      layout={MenuLayout}
      screenLayout={MenuScreenLayout}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {routes.map((name) => (
        <Stack.Screen key={name} name={name} component={SCREENS[name]} />
      ))}
    </Stack.Navigator>
  );
}
