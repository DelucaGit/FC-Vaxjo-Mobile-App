import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Attendance'>;

/** Närvaro (spec section 7). Placeholder until its slice fills it in. */
export default function AttendanceScreen({ navigation }: Props) {
  return <Screen title="Närvaro" onBack={() => navigation.goBack()} />;
}
