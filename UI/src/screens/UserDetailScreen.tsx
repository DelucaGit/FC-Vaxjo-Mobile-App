import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'UserDetail'>;

/** Användare (spec section 7). Placeholder until its slice fills it in. */
export default function UserDetailScreen({ navigation }: Props) {
  return <Screen title="Användare" onBack={() => navigation.goBack()} />;
}
