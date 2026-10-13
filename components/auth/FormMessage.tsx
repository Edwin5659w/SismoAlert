import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export type FormMessageValue = {
  type: 'error' | 'success' | 'info';
  title?: string;
  text: string;
};

const VARIANTS = {
  error: { icon: 'alert-circle' as const, color: colors.danger, background: colors.dangerSoft },
  success: { icon: 'checkmark-circle' as const, color: colors.success, background: colors.successSoft },
  info: { icon: 'information-circle' as const, color: colors.accent, background: colors.accentSoft },
};

export function FormMessage({ message }: { message: FormMessageValue | null }) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      appear.setValue(0);
      Animated.spring(appear, { toValue: 1, speed: 18, bounciness: 6, useNativeDriver: true }).start();
    }
  }, [appear, message]);

  if (!message) {
    return null;
  }

  const variant = VARIANTS[message.type];

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: variant.background, borderColor: variant.color },
        {
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
    >
      <Ionicons name={variant.icon} size={20} color={variant.color} />
      <Text style={styles.textBlock}>
        {message.title ? <Text style={[styles.title, { color: variant.color }]}>{message.title}{'\n'}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  textBlock: {
    flex: 1,
    lineHeight: 19,
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
  },
  text: {
    color: colors.text,
    fontSize: 13.5,
  },
});
