import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditTraining'>;

/** Redigera träning (spec section 7). Placeholder until its slice fills it in. */
export default function EditTrainingScreen({ navigation }: Props) {
  return <Screen title="Redigera träning" onBack={() => navigation.goBack()} />;
}
