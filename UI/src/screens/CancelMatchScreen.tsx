import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setMatchCancelled } from '../api/matches';
import CancelActivityForm from '../components/activities/CancelActivityForm';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CancelMatch'>;

/** "Ställ in match" (issue #134). Same form as "Ställ in träning". */
export default function CancelMatchScreen({ navigation, route }: Props) {
  return (
    <CancelActivityForm
      title="Ställ in match"
      cancel={(reason) => setMatchCancelled(route.params.matchId, true, reason)}
      onBack={() => navigation.goBack()}
    />
  );
}
