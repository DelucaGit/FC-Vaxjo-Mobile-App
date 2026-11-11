import type { NavigatorScreenParams } from '@react-navigation/native';

export type ActivityKind = 'training' | 'match';

/**
 * Every screen inside the tabs (spec section 7), with its params.
 *
 * All tab stacks share this one list. Each stack registers only the routes it needs,
 * so e.g. PlayerView can be opened from Laget, Lag and Sök.
 * Ids are the API's numeric ids.
 */
export type AppStackParamList = {
  // Spelare / Förälder
  Schedule: undefined;
  Coaches: undefined;

  // Tränare / Ordförande / Admin: activities
  Activities: undefined;
  ActivityDetail: { kind: ActivityKind; id: number };
  NewTraining: { teamId: number };
  EditTraining: { trainingId: number };
  NewMatch: { teamId: number };
  CancelTraining: { trainingId: number };
  SetResult: { matchId: number };
  Attendance: { kind: ActivityKind; id: number };

  // Teams and players
  /** "Laget": the coach's own teams. */
  Squad: undefined;
  /** "Lag": every team (Ordförande / Admin). */
  Teams: undefined;
  /** "Lagsida". */
  TeamDetail: { teamId: number };
  NewTeam: undefined;
  AddCoach: { teamId: number };
  /** A player's details, read only. "Redigera" opens PlayerProfile. */
  PlayerView: { userId: number };
  PlayerProfile: { userId: number };
  /** teamId preselects the team when opened from a team page. */
  NewPlayer: { teamId?: number } | undefined;

  // Search and users
  Search: undefined;
  Users: undefined;
  UserDetail: { userId: number };
  NewUser: undefined;

  // Mer
  More: undefined;
  ChangePassword: undefined;
  /** "Tidigare aktiviteter": every role, newest first. */
  PastActivities: undefined;
};

/** All tabs that exist. Which ones a user sees depends on the role (tabsForRole). */
export type TabParamList = {
  ScheduleTab: NavigatorScreenParams<AppStackParamList>;
  CoachesTab: NavigatorScreenParams<AppStackParamList>;
  ActivitiesTab: NavigatorScreenParams<AppStackParamList>;
  SquadTab: NavigatorScreenParams<AppStackParamList>;
  SearchTab: NavigatorScreenParams<AppStackParamList>;
  TeamsTab: NavigatorScreenParams<AppStackParamList>;
  UsersTab: NavigatorScreenParams<AppStackParamList>;
  MoreTab: NavigatorScreenParams<AppStackParamList>;
};

export type TabName = keyof TabParamList;
