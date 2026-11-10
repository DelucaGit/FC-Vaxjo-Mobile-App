import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PlayerProfile'>;

/** Spelare (spec section 7). Placeholder until its slice fills it in. */
export default function PlayerProfileScreen({ navigation }: Props) {
  return <Screen title="Spelare" onBack={() => navigation.goBack()} />;
}
