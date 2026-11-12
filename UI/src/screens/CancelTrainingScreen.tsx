import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setTrainingCancelled } from '../api/trainings';
import CancelActivityForm from '../components/activities/CancelActivityForm';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CancelTraining'>;

/** "Ställ in träning" (spec section 7). Players and parents see the reason in their schedule. */
export default function CancelTrainingScreen({ navigation, route }: Props) {
  return (
    <CancelActivityForm
      title="Ställ in träning"
      cancel={(reason) => setTrainingCancelled(route.params.trainingId, true, reason)}
      onBack={() => navigation.goBack()}
    />
  );
}
