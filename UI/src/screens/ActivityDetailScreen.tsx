import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ActivityDetail'>;

/** Träning / Match (spec section 7). Placeholder until its slice fills it in. */
export default function ActivityDetailScreen({ navigation, route }: Props) {
  return <Screen title={route.params.kind === 'match' ? 'Match' : 'Träning'} onBack={() => navigation.goBack()} />;
}
