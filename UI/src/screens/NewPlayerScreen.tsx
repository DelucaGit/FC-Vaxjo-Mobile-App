import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewPlayer'>;

/** Ny spelare (spec section 7). Placeholder until its slice fills it in. */
export default function NewPlayerScreen({ navigation }: Props) {
  return <Screen title="Ny spelare" onBack={() => navigation.goBack()} />;
}
