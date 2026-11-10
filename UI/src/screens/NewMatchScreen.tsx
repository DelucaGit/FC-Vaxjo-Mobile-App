import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewMatch'>;

/** Ny match (spec section 7). Placeholder until its slice fills it in. */
export default function NewMatchScreen({ navigation }: Props) {
  return <Screen title="Ny match" onBack={() => navigation.goBack()} />;
}
