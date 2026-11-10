/**
 * Everything under /api/my in one place: "my" schedule, children, coaches
 * and teams. The functions live in mySchedule.ts and teams.ts (older screens
 * import them from there); this file only gathers them for new screens.
 *
 * - PLAYER: listMyTrainings(), listMyMatches(), listMyCoaches() without childId.
 * - PARENT: listMyChildren(), then the same calls with the child's id.
 * - COACH and ADMIN: listMyTeams(). CHAIRMAN gets 403 here and uses listTeams().
 */
export {
  listMyChildren,
  listMyCoaches,
  listMyMatches,
  listMyTrainings,
} from './mySchedule';
export type { MyChild, MyCoach, MyMatch, MyTraining } from './mySchedule';
export { listMyTeams } from './teams';
