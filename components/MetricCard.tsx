import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
};

export function MetricCard({ label, value, hint, accent = colors.accent }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minWidth: 100,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },
});
