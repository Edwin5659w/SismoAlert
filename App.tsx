import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafetyOverlay } from './components/safety/SafetyOverlay';
import { AdsProvider } from './context/AdsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EntitlementProvider } from './context/EntitlementContext';
import { SafetyProvider } from './context/SafetyContext';
import { getFirebaseAuth } from './lib/firebase';
import { registerForPushNotificationsAsync, saveExpoPushToken, setupNotificationListeners } from './lib/notifications';
import { AppNavigator, navigationRef } from './navigation/AppNavigator';
import { AuthFlow } from './screens/AuthFlow';
import { publishSafetyProfile } from './services/safety';
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
        // Permite que los contactos de confianza que usan la app reciban avisos de este usuario.
        const current = getFirebaseAuth().currentUser;
        if (current) {
          await publishSafetyProfile(current, token).catch((error) =>
            console.warn('No se pudo publicar el perfil de seguridad.', error),
          );
        }
      } catch (error) {
        console.warn('No se pudo guardar el token push del usuario.', error);
      }
    };

    registerToken();

    const cleanupListeners = setupNotificationListeners((payload) => {
      const route = typeof payload.route === 'string' ? payload.route : 'Inicio';
      const normalized = route.toLowerCase();
      const target =
        normalized === 'configuracion' || normalized === 'settings'
          ? 'Configuracion'
          : normalized === 'seguridad'
            ? 'Seguridad'
            : 'Inicio';

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
    <EntitlementProvider>
      <SafetyProvider>
        <AdsProvider>
          <NotificationBridge userId={user.uid} />
          <AppNavigator />
          <SafetyOverlay />
        </AdsProvider>
      </SafetyProvider>
    </EntitlementProvider>
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
