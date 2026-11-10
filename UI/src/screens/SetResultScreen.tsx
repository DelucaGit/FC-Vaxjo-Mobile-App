import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SetResult'>;

/** Ange resultat (spec section 7). Placeholder until its slice fills it in. */
export default function SetResultScreen({ navigation }: Props) {
  return <Screen title="Ange resultat" onBack={() => navigation.goBack()} />;
}
