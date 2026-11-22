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
  /** type comes from the button the coach pressed on "Aktiviteter". */
  NewTraining: { teamId: number; type: TrainingType };
  EditTraining: { trainingId: number };
  NewMatch: { teamId: number };
  EditMatch: { matchId: number };
  CancelTraining: { trainingId: number };
  CancelMatch: { matchId: number };
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

  // Every role: "Byt lösenord" opens from the profile menu.
  ChangePassword: undefined;
  /** "Tidigare aktiviteter": every role, newest first. */
  PastActivities: undefined;
};
