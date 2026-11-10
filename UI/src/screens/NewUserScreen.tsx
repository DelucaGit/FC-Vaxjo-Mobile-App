import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewUser'>;

/** Ny användare (spec section 7). Placeholder until its slice fills it in. */
export default function NewUserScreen({ navigation }: Props) {
  return <Screen title="Ny användare" onBack={() => navigation.goBack()} />;
}
