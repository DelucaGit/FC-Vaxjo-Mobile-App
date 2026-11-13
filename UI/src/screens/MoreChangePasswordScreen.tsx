import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChangePasswordForm } from '../components/account/ChangePasswordForm';
import { Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;

/** Byt lösenord under "Mer" (spec section 7). Goes back to "Mer" when saved. */
export default function MoreChangePasswordScreen({ navigation }: Props) {
  return (
    <Screen title="Byt lösenord" onBack={() => navigation.goBack()}>
      <View style={styles.body}>
        <ChangePasswordForm onSaved={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.page },
});
