import { Ionicons } from '@expo/vector-icons';
import { ReactNode, forwardRef, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

type AuthTextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  icon: IconName;
  error?: string;
  /** Muestra el botón para ver u ocultar la contraseña. */
  password?: boolean;
  trailing?: ReactNode;
};

export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(function AuthTextField(
  { label, icon, error, password = false, trailing, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number) => {
    Animated.timing(focusAnim, { toValue, duration: 160, useNativeDriver: false }).start();
  };

  const borderColor = error
    ? colors.danger
    : focusAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.accent] });

  const iconColor = error ? colors.danger : focused ? colors.accent : colors.muted;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, focused && styles.labelFocused, error ? styles.labelError : null]}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.field,
          { borderColor },
          focused && styles.fieldFocused,
          !editable && styles.fieldDisabled,
        ]}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={password && hidden}
          placeholderTextColor={colors.mutedDim}
          selectionColor={colors.accent}
          style={styles.input}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true);
            animateTo(1);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            animateTo(0);
            onBlur?.(event);
          }}
        />
        {trailing}
        {password ? (
          <Pressable
            hitSlop={12}
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 2,
  },
  labelFocused: {
    color: colors.accent,
  },
  labelError: {
    color: colors.danger,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 54,
  },
  fieldFocused: {
    backgroundColor: '#0F1A2C',
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 2,
  },
  error: {
    color: colors.danger,
    fontSize: 12.5,
    flex: 1,
  },
});
