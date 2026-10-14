import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DetailRow } from '../components/DetailRow';
import { Header } from '../components/Header';
import { SectionTitle } from '../components/SectionTitle';
import { magnitudeColor, severityColors } from '../lib/magnitude';
import { formatLocalTime, formatUtcTime } from '../lib/time';
import { subscribeEarthquake } from '../services/earthquakes';
import { colors, radius, spacing } from '../theme';
import { Earthquake, RootTabParamList } from '../types';

type DetailScreenProps = BottomTabScreenProps<RootTabParamList, 'Detalle'>;

export function DetailScreen({ navigation, route }: DetailScreenProps) {
  const { id } = route.params;
  const [earthquake, setEarthquake] = useState<Earthquake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    try {
      return subscribeEarthquake(
        id,
        (item) => {
          setEarthquake(item);
          setLoading(false);
        },
        (nextError) => {
          setError(nextError.message);
          setLoading(false);
        },
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'No se pudo cargar el sismo de Firebase.',
      );
      setLoading(false);
    }
  }, [id]);

  const magColor = earthquake ? magnitudeColor(earthquake.magnitude) : colors.accent;
  const severityColor = earthquake ? severityColors[earthquake.severity] : colors.accent;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Detalle del sismo" subtitle="Información técnica registrada" />

        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={colors.accent} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && !earthquake ? (
          <Text style={styles.empty}>No se encontró el sismo solicitado.</Text>
        ) : null}

        {earthquake ? (
          <>
            <View style={[styles.hero, { backgroundColor: `${magColor}22` }]}>
              <Text style={[styles.heroMagnitude, { color: magColor }]}>
                {earthquake.magnitude.toFixed(1)}
              </Text>
              <Text style={styles.heroLabel}>Magnitud Mw</Text>
              <View style={[styles.severityChip, { backgroundColor: `${severityColor}22` }]}>
                <Text style={[styles.severityText, { color: severityColor }]}>
                  {earthquake.severity}
                </Text>
              </View>
            </View>

            <SectionTitle title="Datos del evento" />
            <DetailRow label="Ubicación" value={earthquake.location} />
            <DetailRow label="Profundidad" value={`${earthquake.depthKm} km`} />
            <DetailRow label="Hora local" value={formatLocalTime(earthquake.occurredAt)} />
            <DetailRow label="Hora UTC" value={formatUtcTime(earthquake.occurredAt)} />
            <DetailRow label="Registrado" value={earthquake.timeAgo} />
            {earthquake.latitude !== undefined && earthquake.longitude !== undefined ? (
              <DetailRow
                label="Coordenadas"
                value={`${earthquake.latitude.toFixed(3)}, ${earthquake.longitude.toFixed(3)}`}
              />
            ) : null}
            <DetailRow label="Fuente" value={earthquake.source ?? 'Sin fuente'} />
            <DetailRow label="ID" value={earthquake.id} />

            {earthquake.url ? (
              <Pressable style={styles.link} onPress={() => Linking.openURL(earthquake.url as string)}>
                <Text style={styles.linkText}>Ver reporte original</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  loader: {
    marginTop: spacing.lg,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
  },
  empty: {
    color: colors.muted,
    marginTop: spacing.md,
  },
  hero: {
    alignItems: 'center',
    borderRadius: radius.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
  },
  heroMagnitude: {
    fontSize: 56,
    fontWeight: '800',
  },
  heroLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  severityChip: {
    marginTop: 10,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  link: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: colors.accent,
    fontWeight: '700',
  },
});
