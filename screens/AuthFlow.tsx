import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

type AuthRoute = 'login' | 'register';

/** Alterna entre inicio de sesión y registro con una transición suave. */
export function AuthFlow() {
  const [route, setRoute] = useState<AuthRoute>('login');
  const transition = useRef(new Animated.Value(1)).current;

  const goTo = (next: AuthRoute) => {
    Animated.timing(transition, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setRoute(next);
      Animated.timing(transition, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  // Botón "atrás" de Android: desde registro vuelve al inicio de sesión.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'register') {
        goTo('login');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const direction = route === 'register' ? 1 : -1;

  return (
    <View style={styles.container}>
    <Animated.View
      style={[
        styles.flex,
        {
          opacity: transition,
          transform: [
            {
              translateX: transition.interpolate({
                inputRange: [0, 1],
                outputRange: [24 * direction, 0],
              }),
            },
          ],
        },
      ]}
    >
      {route === 'login' ? (
        <LoginScreen onGoToRegister={() => goTo('register')} />
      ) : (
        <RegisterScreen onGoToLogin={() => goTo('login')} />
      )}
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
});
