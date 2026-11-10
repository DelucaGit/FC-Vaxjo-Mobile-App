import type { TabName } from './types';

/**
 * Tabs per role, in order (spec sections 6 and 8).
 * An unknown role only gets "Mer", so the person can still log out.
 */
export function tabsForRole(roleName: string | null | undefined): readonly TabName[] {
  switch (roleName) {
    case 'PLAYER':
    case 'PARENT':
      return ['ScheduleTab', 'CoachesTab', 'MoreTab'];
    case 'COACH':
      return ['ActivitiesTab', 'SquadTab', 'SearchTab', 'MoreTab'];
    case 'CHAIRMAN':
    case 'ADMIN':
      return ['ActivitiesTab', 'TeamsTab', 'UsersTab', 'MoreTab'];
    default:
      return ['MoreTab'];
  }
}
