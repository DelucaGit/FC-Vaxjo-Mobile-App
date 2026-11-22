import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ToastProvider } from './src/components/ui';
import MainStack from './src/navigation/MainStack';
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

/** Login, then "Byt lösenord" when the account has a temporary password, then the pages with the menu. */
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
  return <MainStack />;
}

export default function App() {
  // The keys become the fontFamily names used in src/theme/typography.ts.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* If a font fails to load, the app still starts with the system font. */}
      {fontsLoaded || fontError ? (
        // ToastProvider sits above the navigators, so "Träningen är sparad" stays after goBack().
        <ToastProvider>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </ToastProvider>
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
