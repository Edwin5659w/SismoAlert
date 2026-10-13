import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const BAR_COUNT = 44;

type SeismicWaveProps = {
  height?: number;
};

/** Onda tipo sismógrafo: barras que vibran con más fuerza en el centro (el "evento"). */
export function SeismicWave({ height = 48 }: SeismicWaveProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, index) => {
        const center = (BAR_COUNT - 1) / 2;
        const distance = Math.abs(index - center) / center;
        const envelope = Math.max(0.1, Math.exp(-distance * distance * 4.2));
        const jitter = 0.55 + 0.45 * Math.abs(Math.sin(index * 1.7));
        const amplitude = envelope * jitter;
        const phase = (index % 7) / 7;
        const outputRange = [0, 1, 2, 3, 4].map((step) => {
          const wave = Math.abs(Math.sin(2 * Math.PI * (step / 4 + phase)));
          return Math.max(0.06, amplitude * (0.35 + 0.65 * wave));
        });
        return { amplitude, outputRange, highlight: envelope > 0.45 };
      }),
    [],
  );

  return (
    <View
      style={[styles.row, { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height,
              backgroundColor: bar.highlight ? colors.accent : colors.mutedDim,
              opacity: bar.highlight ? 1 : 0.55,
              transform: [
                {
                  scaleY: reduceMotion
                    ? bar.outputRange[1]
                    : progress.interpolate({
                        inputRange: [0, 0.25, 0.5, 0.75, 1],
                        outputRange: bar.outputRange,
                      }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
