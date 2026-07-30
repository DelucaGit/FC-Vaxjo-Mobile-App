import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { colors } from './src/theme';

type Gate = 'login' | 'register';

function AppGate() {
  const { user, bootstrapping } = useAuth();
  const [gate, setGate] = useState<Gate>('login');

  if (bootstrapping) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.pitch} size="large" />
      </View>
    );
  }

  if (!user) {
    if (gate === 'register') {
      return <RegisterScreen onGoLogin={() => setGate('login')} />;
    }
    return <LoginScreen onGoRegister={() => setGate('register')} />;
  }

  return <HomeScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
});
