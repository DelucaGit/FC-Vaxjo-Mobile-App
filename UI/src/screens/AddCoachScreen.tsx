import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddCoach'>;

/** Lägg till tränare (spec section 7). Placeholder until its slice fills it in. */
export default function AddCoachScreen({ navigation }: Props) {
  return <Screen title="Lägg till tränare" onBack={() => navigation.goBack()} />;
}
