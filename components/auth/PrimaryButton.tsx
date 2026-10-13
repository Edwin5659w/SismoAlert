import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, icon }: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  const springTo = (toValue: number) => {
    Animated.spring(scale, { toValue, speed: 40, bounciness: 6, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.shadow, inactive && styles.shadowOff, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => springTo(0.97)}
        onPressOut={() => springTo(1)}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          disabled && !loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <>
            <Text style={styles.text}>{title}</Text>
            {icon ? <Ionicons name={icon} size={18} color={colors.onAccent} /> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.md,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  shadowOff: {
    shadowOpacity: 0,
    elevation: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.accentStrong,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
