import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

type NavRowProps = {
  icon: IconName;
  title: string;
  caption?: string;
  status?: string;
  statusColor?: string;
  tint?: string;
  onPress: () => void;
};

/** Fila tocable con icono, texto, estado y flecha. */
export function NavRow({
  icon,
  title,
  caption,
  status,
  statusColor = colors.muted,
  tint = colors.accent,
  onPress,
}: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {status ? <Text style={[styles.status, { color: statusColor }]}>{status}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.mutedDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  status: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
