import {
  CalendarDays,
  ClipboardList,
  Contact,
  History,
  Search,
  Shield,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import type { AppStackParamList } from './types';

/** The pages a menu item can open. They take no params, so the menu can open them directly. */
export type MenuRoute = {
  [Name in keyof AppStackParamList]: undefined extends AppStackParamList[Name] ? Name : never;
}[keyof AppStackParamList];

export type MenuItem = {
  label: string;
  route: MenuRoute;
  icon: LucideIcon;
};

const PAST: MenuItem = { label: 'Tidigare aktiviteter', route: 'PastActivities', icon: History };
const ACTIVITIES: MenuItem = { label: 'Aktiviteter', route: 'Activities', icon: CalendarDays };

const PLAYER_MENU: readonly MenuItem[] = [
  { label: 'Schema', route: 'Schedule', icon: CalendarDays },
  { label: 'Tränare', route: 'Coaches', icon: Contact },
  { label: 'Mina ledighetsbegäran', route: 'MyLeaveRequests', icon: ClipboardList },
  PAST,
];

const COACH_MENU: readonly MenuItem[] = [
  ACTIVITIES,
  { label: 'Lag', route: 'Squad', icon: Users },
  { label: 'Sök spelare', route: 'Search', icon: Search },
  PAST,
];

const ADMIN_MENU: readonly MenuItem[] = [
  ACTIVITIES,
  { label: 'Lag', route: 'Teams', icon: Shield },
  { label: 'Användare', route: 'Users', icon: UserRound },
  { label: 'Ny användare', route: 'NewUser', icon: UserPlus },
  PAST,
];

/**
 * The menu for a role, in the order it is shown.
 * An unknown role gets an empty menu (the profile menu still has Logga ut).
 */
export function menuForRole(roleName: string | null | undefined): readonly MenuItem[] {
  switch (roleName) {
    case 'PLAYER':
    case 'PARENT':
      return PLAYER_MENU;
    case 'COACH':
      return COACH_MENU;
    case 'CHAIRMAN':
    case 'ADMIN':
      return ADMIN_MENU;
    default:
      return [];
  }
}
