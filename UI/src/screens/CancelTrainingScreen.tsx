import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CancelTraining'>;

/** Ställ in träning (spec section 7). Placeholder until its slice fills it in. */
export default function CancelTrainingScreen({ navigation }: Props) {
  return <Screen title="Ställ in träning" onBack={() => navigation.goBack()} />;
}
