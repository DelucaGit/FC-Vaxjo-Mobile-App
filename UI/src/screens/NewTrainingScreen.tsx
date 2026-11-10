import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTraining'>;

/** Ny träning (spec section 7). Placeholder until its slice fills it in. */
export default function NewTrainingScreen({ navigation }: Props) {
  return <Screen title="Ny träning" onBack={() => navigation.goBack()} />;
}
