import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import MainTabs from './src/navigation/MainTabs';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import LoginScreen from './src/screens/LoginScreen';
import { colors } from './src/theme';

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/** Login, then "Byt lösenord" when the account has a temporary password, then the tabs. */
function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }
  if (!session) {
    return <LoginScreen />;
  }
  if (session.mustChangePassword) {
    return <ChangePasswordScreen />;
  }
  return <MainTabs />;
}

export default function App() {
  // The keys become the fontFamily names used in src/theme/typography.ts.
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* If a font fails to load, the app still starts with the system font. */}
      {fontsLoaded || fontError ? (
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      ) : (
        <Loading />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
