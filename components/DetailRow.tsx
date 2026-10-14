import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type DetailRowProps = {
  label: string;
  value: string;
};

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
  },
  value: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
});
