import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';

const CHECKS = [
  { key: 'length', label: '8+ caracteres', test: (value: string) => value.length >= 8 },
  { key: 'upper', label: 'Mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'Minúscula', test: (value: string) => /[a-z]/.test(value) },
  { key: 'number', label: 'Número', test: (value: string) => /\d/.test(value) },
  { key: 'symbol', label: 'Símbolo', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function evaluatePassword(value: string) {
  const results = CHECKS.map((check) => ({ ...check, ok: check.test(value) }));
  const score = results.filter((item) => item.ok).length;
  return { results, score, strong: score === CHECKS.length };
}

const LEVELS = [
  { label: 'Muy débil', color: colors.danger },
  { label: 'Muy débil', color: colors.danger },
  { label: 'Débil', color: colors.danger },
  { label: 'Media', color: colors.warning },
  { label: 'Buena', color: colors.accent },
  { label: 'Segura', color: colors.success },
];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) {
    return null;
  }

  const { results, score } = evaluatePassword(password);
  const level = LEVELS[score];

  return (
    <View style={styles.container} accessibilityLabel={`Seguridad de la contraseña: ${level.label}`}>
      <View style={styles.header}>
        <View style={styles.segments}>
          {CHECKS.map((check, index) => (
            <View
              key={check.key}
              style={[styles.segment, { backgroundColor: index < score ? level.color : colors.border }]}
            />
          ))}
        </View>
        <Text style={[styles.level, { color: level.color }]}>{level.label}</Text>
      </View>
      <View style={styles.checks}>
        {results.map((item) => (
          <View key={item.key} style={[styles.chip, item.ok && styles.chipOk]}>
            <Ionicons
              name={item.ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={13}
              color={item.ok ? colors.success : colors.mutedDim}
            />
            <Text style={[styles.chipText, item.ok && styles.chipTextOk]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -6,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  level: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
  },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOk: {
    borderColor: 'rgba(52, 211, 153, 0.35)',
    backgroundColor: colors.successSoft,
  },
  chipText: {
    color: colors.mutedDim,
    fontSize: 11.5,
    fontWeight: '600',
  },
  chipTextOk: {
    color: colors.success,
  },
});
