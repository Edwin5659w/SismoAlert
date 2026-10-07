import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Earthquake, Severity } from '../types';

const severityColors: Record<Severity, string> = {
  Leve: colors.success,
  Moderado: colors.warning,
  Fuerte: '#FB923C',
  'Muy fuerte': colors.danger,
};

function magnitudeColor(magnitude: number) {
  if (magnitude >= 6) return colors.danger;
  if (magnitude >= 5) return '#FB923C';
  if (magnitude >= 4) return colors.warning;
  return colors.success;
}

type EarthquakeCardProps = {
  earthquake: Earthquake;
};

export function EarthquakeCard({ earthquake }: EarthquakeCardProps) {
  const magColor = magnitudeColor(earthquake.magnitude);
  const severityColor = severityColors[earthquake.severity];

  return (
    <View style={styles.card}>
      <View style={[styles.magnitudeBadge, { backgroundColor: `${magColor}22` }]}>
        <Text style={[styles.magnitude, { color: magColor }]}>
          {earthquake.magnitude.toFixed(1)}
        </Text>
        <Text style={styles.magnitudeLabel}>Mw</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.location}>{earthquake.location}</Text>
        <Text style={styles.meta}>
          Profundidad {earthquake.depthKm} km · {earthquake.timeAgo}
        </Text>
        <View style={[styles.severityChip, { backgroundColor: `${severityColor}22` }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>
            {earthquake.severity}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  magnitudeBadge: {
    width: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  magnitude: {
    fontSize: 22,
    fontWeight: '800',
  },
  magnitudeLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  location: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  severityChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
