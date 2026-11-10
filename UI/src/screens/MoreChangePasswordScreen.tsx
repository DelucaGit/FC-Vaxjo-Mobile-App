import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;

/** Byt lösenord (spec section 7). Placeholder until its slice fills it in. */
export default function MoreChangePasswordScreen({ navigation }: Props) {
  return <Screen title="Byt lösenord" onBack={() => navigation.goBack()} />;
}
