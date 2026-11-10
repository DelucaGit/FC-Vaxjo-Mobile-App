import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTeam'>;

/** Nytt lag (spec section 7). Placeholder until its slice fills it in. */
export default function NewTeamScreen({ navigation }: Props) {
  return <Screen title="Nytt lag" onBack={() => navigation.goBack()} />;
}
