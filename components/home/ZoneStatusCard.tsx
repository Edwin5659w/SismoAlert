import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { SeismicWave } from '../auth/SeismicWave';

export type ZoneLevel = 'calm' | 'moderate' | 'high';

const LEVELS: Record<ZoneLevel, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  calm: { label: 'Zona tranquila', color: colors.success, icon: 'shield-checkmark' },
  moderate: { label: 'Actividad moderada', color: colors.warning, icon: 'alert-circle' },
  high: { label: 'Actividad alta', color: colors.danger, icon: 'warning' },
};

type ZoneStatusCardProps = {
  locationStatus: 'off' | 'loading' | 'ready' | 'denied' | 'error';
  city?: string;
  level: ZoneLevel;
  nearbyCount: number;
  radiusLabel: string;
  nearestLabel?: string;
  strongestLabel?: string;
  onEnableLocation: () => void;
};

/** Tarjeta principal del inicio: qué tan activa está la zona del usuario. */
export function ZoneStatusCard({
  locationStatus,
  city,
  level,
  nearbyCount,
  radiusLabel,
  nearestLabel,
  strongestLabel,
  onEnableLocation,
}: ZoneStatusCardProps) {
  if (locationStatus !== 'ready') {
    const loading = locationStatus === 'loading';
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="location" size={22} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>
              {loading ? 'Buscando tu ubicación…' : 'Conoce el estado de tu zona'}
            </Text>
            <Text style={styles.caption}>
              {locationStatus === 'denied'
                ? 'El permiso de ubicación está desactivado.'
                : 'Activa la ubicación para ver qué tan cerca ocurren los sismos y recibir el aviso "¿Estás bien?".'}
            </Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
        ) : (
          <Pressable onPress={onEnableLocation} style={styles.button}>
            <Text style={styles.buttonText}>Activar ubicación</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const meta = LEVELS[level];
  return (
    <View style={[styles.card, { borderColor: `${meta.color}55` }]}>
      <View style={[styles.glow, { backgroundColor: meta.color }]} />
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.kicker}>
            <Ionicons name="location-sharp" size={11} color={colors.muted} /> {city ?? 'Tu ubicación'}
          </Text>
          <Text style={[styles.level, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{nearbyCount}</Text>
          <Text style={styles.statLabel}>sismos a menos de {radiusLabel} en 24 h</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{strongestLabel ?? '—'}</Text>
          <Text style={styles.statLabel}>mayor magnitud cercana</Text>
        </View>
      </View>
      {nearestLabel ? <Text style={styles.nearest}>{nearestLabel}</Text> : null}
      <View style={styles.wave}>
        <SeismicWave height={26} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardMuted: {
    borderStyle: 'dashed',
    borderColor: 'rgba(45, 212, 191, 0.4)',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -120,
    right: -80,
    opacity: 0.07,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.onAccent,
    fontWeight: '800',
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  level: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  nearest: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: spacing.md,
  },
  wave: {
    marginTop: spacing.md,
    opacity: 0.8,
  },
});
