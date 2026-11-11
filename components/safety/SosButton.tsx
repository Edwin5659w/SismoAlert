import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

const HOLD_MS = 1500;

type SosButtonProps = {
  onActivate: () => void;
  compact?: boolean;
};

/** Botón SOS: hay que mantenerlo presionado para evitar activaciones accidentales. */
export function SosButton({ onActivate, compact = false }: SosButtonProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const start = () => {
    setHolding(true);
    Vibration.vibrate(30);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        Vibration.vibrate(200);
        progress.setValue(0);
        setHolding(false);
        onActivate();
      }
    });
  };

  const cancel = () => {
    setHolding(false);
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const size = compact ? 64 : 112;
  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
            },
          ]}
        />
        <Pressable
          onPressIn={start}
          onPressOut={cancel}
          accessibilityRole="button"
          accessibilityLabel="Botón SOS. Mantén presionado para pedir ayuda"
          style={({ pressed }) => [
            styles.button,
            { width: size, height: size, borderRadius: size / 2 },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="warning" size={compact ? 22 : 34} color="#fff" />
          <Text style={[styles.label, compact && styles.labelCompact]}>SOS</Text>
        </Pressable>
      </View>
      {compact ? null : (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {holding ? 'Sigue presionando…' : 'Mantén presionado para pedir ayuda'}
          </Text>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: fillWidth }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.md,
  },
  wrapperCompact: {
    gap: 0,
  },
  pulse: {
    position: 'absolute',
    backgroundColor: colors.danger,
  },
  button: {
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  pressed: {
    backgroundColor: '#E11D48',
    transform: [{ scale: 0.96 }],
  },
  label: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  labelCompact: {
    fontSize: 13,
    letterSpacing: 1,
  },
  hint: {
    alignItems: 'center',
    gap: 8,
    width: 220,
  },
  hintText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.danger,
  },
});
