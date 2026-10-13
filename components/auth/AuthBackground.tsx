import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const RING_SIZE = 320;

/** Fondo decorativo: resplandores suaves y anillos de epicentro que se expanden. */
export function AuthBackground() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 3600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.25] }) }],
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <View style={styles.epicenter}>
        <View style={[styles.ring, { transform: [{ scale: 1 }], opacity: 0.08 }]} />
        <View style={[styles.ring, { transform: [{ scale: 0.72 }], opacity: 0.12 }]} />
        <View style={[styles.ring, { transform: [{ scale: 0.44 }], opacity: 0.18 }]} />
        <Animated.View style={[styles.ring, styles.pulseRing, pulseStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    width: 420,
    height: 420,
    top: -220,
    left: -140,
    backgroundColor: 'rgba(45, 212, 191, 0.10)',
  },
  glowBottom: {
    width: 380,
    height: 380,
    bottom: -200,
    right: -160,
    backgroundColor: 'rgba(56, 189, 248, 0.07)',
  },
  epicenter: {
    position: 'absolute',
    top: -RING_SIZE / 2 + 40,
    right: -RING_SIZE / 2 + 30,
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  pulseRing: {
    borderWidth: 2,
  },
});
