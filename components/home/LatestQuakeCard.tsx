import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../../lib/geo';
import { magnitudeColor, severityColors } from '../../lib/magnitude';
import { formatLocalTime } from '../../lib/time';
import { colors, radius, spacing } from '../../theme';
import { Earthquake } from '../../types';

type LatestQuakeCardProps = {
  earthquake: Earthquake;
  distanceKm?: number;
  onPress: () => void;
};

/** El sismo más reciente, destacado con su magnitud en grande. */
export function LatestQuakeCard({ earthquake, distanceKm, onPress }: LatestQuakeCardProps) {
  const color = magnitudeColor(earthquake.magnitude);
  const severity = severityColors[earthquake.severity];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Último sismo, magnitud ${earthquake.magnitude.toFixed(1)} en ${earthquake.location}`}
    >
      <View style={[styles.ring, { borderColor: `${color}55` }]}>
        <View style={[styles.circle, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.magnitude, { color }]}>{earthquake.magnitude.toFixed(1)}</Text>
          <Text style={styles.unit}>Mw</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={[styles.chip, { backgroundColor: `${severity}22` }]}>
          <Text style={[styles.chipText, { color: severity }]}>{earthquake.severity}</Text>
        </View>
        <Text style={styles.location} numberOfLines={2}>
          {earthquake.location}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.muted} />
          <Text style={styles.meta}>
            {earthquake.timeAgo} · {formatLocalTime(earthquake.occurredAt)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="arrow-down-outline" size={13} color={colors.muted} />
          <Text style={styles.meta}>Profundidad {earthquake.depthKm} km</Text>
        </View>
        {distanceKm !== undefined ? (
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={13} color={colors.accent} />
            <Text style={[styles.meta, { color: colors.accent }]}>{formatDistance(distanceKm)} de ti</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magnitude: {
    fontSize: 28,
    fontWeight: '900',
  },
  unit: {
    color: colors.muted,
    fontSize: 11,
    marginTop: -2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  location: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
});
