import type { TrainingType } from '../api/trainingTypes';

export type ActivityKind = 'training' | 'match';

/**
 * Every screen after login (spec section 7), with its params.
 *
 * The one stack (MainStack) registers only the routes the role may use (routesForRole),
 * so e.g. PlayerView can be opened from Lag and Sök spelare.
 * Ids are the API's numeric ids.
 */
export type AppStackParamList = {
  // Spelare / Förälder
  Schedule: undefined;
  Coaches: undefined;
  /** "Mina ledighetsbegäran": the player's own requests, or the selected child's. */
  MyLeaveRequests: undefined;
  /**
   * "Begär ledigt" for one upcoming activity. playerUserId is the selected child
   * (PARENT); a PLAYER leaves it out. title and startsAt only show which activity it is.
   */
  RequestLeave: {
    kind: ActivityKind;
    id: number;
    playerUserId?: number;
    title: string;
    startsAt: string;
    endsAt?: string | null;
    /** The child's first name, shown to a parent: "För Elsa". */
    forName?: string;
  };

  // Tränare / Ordförande / Admin: activities
  Activities: undefined;
  ActivityDetail: { kind: ActivityKind; id: number };
  /**
   * The "Ny träning" guide. From the start page's plus button: the team and type picked there.
   * From the menu: no params, so the coach picks the team and it is a football training.
   */
  NewTraining: { teamId?: number; type?: TrainingType } | undefined;
  EditTraining: { trainingId: number };
  /**
   * The "Ny match" guide. From the start page's plus button: the team picked there.
   * From the menu: no params, so the coach picks the team.
   */
  NewMatch: { teamId?: number } | undefined;
  EditMatch: { matchId: number };
  CancelTraining: { trainingId: number };
  CancelMatch: { matchId: number };
  SetResult: { matchId: number };
  Attendance: { kind: ActivityKind; id: number };
  /** "Ledighetsbegäran": the pending requests to answer with Godkänn or Neka. */
  LeaveRequests: undefined;

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

  // Every role: "Byt lösenord" opens from the profile menu.
  ChangePassword: undefined;
  /** "Tidigare aktiviteter": every role, newest first. */
  PastActivities: undefined;
};
