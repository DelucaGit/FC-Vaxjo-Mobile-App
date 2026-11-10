import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TeamDetail'>;

/** Lag (spec section 7). Placeholder until its slice fills it in. */
export default function TeamDetailScreen({ navigation }: Props) {
  return <Screen title="Lag" onBack={() => navigation.goBack()} />;
}
