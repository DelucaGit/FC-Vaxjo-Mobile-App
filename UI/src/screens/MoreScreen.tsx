import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { List, Row, RowTitle, Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'More'>;

/** "Mer" (spec section 7). S1 adds name and role at the top. */
export default function MoreScreen({ navigation }: Props) {
  const { logout } = useAuth();

  return (
    <Screen title="Mer">
      <List>
        <Row onPress={() => navigation.navigate('ChangePassword')}>
          <RowTitle>Byt lösenord</RowTitle>
        </Row>
        <Row onPress={() => logout()}>
          <RowTitle>Logga ut</RowTitle>
        </Row>
      </List>
    </Screen>
  );
}
