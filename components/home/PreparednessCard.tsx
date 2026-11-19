import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PreparednessCheck } from '../../lib/preparedness';
import { colors, radius, spacing } from '../../theme';

type PreparednessCardProps = {
  percent: number;
  checks: PreparednessCheck[];
  onOpen: (check: PreparednessCheck) => void;
};

function levelColor(percent: number) {
  if (percent >= 80) return colors.success;
  if (percent >= 45) return colors.warning;
  return colors.danger;
}

/** Progreso de preparación: contactos, ficha, kit, punto de encuentro y simulacro. */
export function PreparednessCard({ percent, checks, onOpen }: PreparednessCardProps) {
  const color = levelColor(percent);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Tu preparación</Text>
          <Text style={styles.caption}>
            {percent >= 80
              ? '¡Muy bien! Estás listo para una emergencia.'
              : 'Completa estos pasos para estar listo.'}
          </Text>
        </View>
        <Text style={[styles.percent, { color }]}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      {checks.map((check) => (
        <Pressable
          key={check.id}
          onPress={() => onOpen(check)}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Ionicons
            name={check.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={check.done ? colors.success : colors.mutedDim}
          />
          <Text style={[styles.itemText, check.done && styles.itemDone]}>{check.label}</Text>
          {check.done ? null : <Ionicons name="chevron-forward" size={16} color={colors.mutedDim} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  caption: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: 2,
  },
  percent: {
    fontSize: 30,
    fontWeight: '900',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  itemText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  itemDone: {
    color: colors.muted,
  },
});
