import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { registerForPushNotificationsAsync, saveExpoPushToken, setupNotificationListeners } from './lib/notifications';
import { AppNavigator, navigationRef } from './navigation/AppNavigator';
import { AuthFlow } from './screens/AuthFlow';
import { colors } from './theme';

function NotificationBridge({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    const registerToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token || cancelled) {
          return;
        }
        await saveExpoPushToken(userId, token);
      } catch (error) {
        console.warn('No se pudo guardar el token push del usuario.', error);
      }
    };

    registerToken();

    const cleanupListeners = setupNotificationListeners((payload) => {
      const route = typeof payload.route === 'string' ? payload.route : 'Inicio';
      const normalized = route.toLowerCase();
      const target = normalized === 'configuracion' || normalized === 'settings' ? 'Configuracion' : 'Inicio';

      if (!navigationRef.isReady()) {
        return;
      }

      navigationRef.navigate(target as never);
    });

    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [userId]);

  return null;
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <AuthFlow />;
  }

  return (
    <>
      <NotificationBridge userId={user.uid} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
