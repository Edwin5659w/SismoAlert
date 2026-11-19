import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../../lib/geo';
import { magnitudeColor } from '../../lib/magnitude';
import { colors, radius, spacing } from '../../theme';
import { Earthquake } from '../../types';

type CompactQuakeRowProps = {
  earthquake: Earthquake;
  distanceKm?: number;
  onPress: () => void;
  last?: boolean;
};

export function CompactQuakeRow({ earthquake, distanceKm, onPress, last }: CompactQuakeRowProps) {
  const color = magnitudeColor(earthquake.magnitude);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.border, pressed && styles.pressed]}
    >
      <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.magnitude, { color }]}>{earthquake.magnitude.toFixed(1)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.location} numberOfLines={1}>
          {earthquake.location}
        </Text>
        <Text style={styles.meta}>
          {earthquake.timeAgo}
          {distanceKm !== undefined ? ` · ${formatDistance(distanceKm)}` : ''} · {earthquake.depthKm} km prof.
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magnitude: {
    fontSize: 17,
    fontWeight: '900',
  },
  body: {
    flex: 1,
  },
  location: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
});
