import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import { TeamActivityList } from './ActivitiesScreen';
import { MyActivityList } from './ScheduleScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'PastActivities'>;

/** Roles that see a team's activities ("Aktiviteter"); the others see their own schedule. */
const TEAM_ROLES = ['COACH', 'CHAIRMAN', 'ADMIN'];

/**
 * "Tidigare aktiviteter" (opened from Mer): activities before today, newest first.
 * Each role sees the same teams or children as on its own schedule, so the list
 * reuses that screen's list with when="past".
 */
export default function PastActivitiesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const title = 'Tidigare aktiviteter';
  const goBack = () => navigation.goBack();

  if (TEAM_ROLES.includes(session?.roleName ?? '')) {
    return <TeamActivityList title={title} when="past" navigation={navigation} onBack={goBack} />;
  }
  return <MyActivityList title={title} when="past" onBack={goBack} />;
}
