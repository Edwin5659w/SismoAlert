import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EarthquakeCard } from '../components/EarthquakeCard';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { SectionTitle } from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { subscribeEarthquakes } from '../services/earthquakes';
import { defaultSettings, subscribeUserSettings } from '../services/userSettings';
import { colors, radius, spacing } from '../theme';
import { Earthquake, UserSettings } from '../types';

function parseMagnitude(option: string) {
  return Number.parseFloat(option.replace('+', '')) || 0;
}

export function HomeScreen() {
  const { user } = useAuth();
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    let unsubscribeSettings = () => {};
    let unsubscribeEarthquakes = () => {};

    const start = async () => {
      try {
        unsubscribeEarthquakes = subscribeEarthquakes((items) => {
          setEarthquakes(items);
          setLoading(false);
        });
        unsubscribeSettings = subscribeUserSettings(user.uid, setSettings);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'No se pudieron cargar los sismos de Firebase.',
        );
        setLoading(false);
      }
    };

    start();

    return () => {
      unsubscribeEarthquakes();
      unsubscribeSettings();
    };
  }, [user]);

  const minMagnitude = parseMagnitude(settings.minMagnitude);
  const visibleEarthquakes = useMemo(
    () => earthquakes.filter((item) => item.magnitude >= minMagnitude),
    [earthquakes, minMagnitude],
  );
  const strongest = [...visibleEarthquakes].sort((a, b) => b.magnitude - a.magnitude)[0];
  const last24h = earthquakes.filter((item) => Date.now() - item.occurredAt <= 24 * 60 * 60 * 1000);
  const perceptible = last24h.filter((item) => item.magnitude >= 4).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="SismoAlert" subtitle="Monitoreo sísmico conectado a Firebase" />

        <View style={styles.status}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {user?.email ? `Sesión: ${user.email}` : 'Sistema activo'}
          </Text>
        </View>

        {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SectionTitle
          title="Últimos sismos registrados"
          caption={`Firestore · umbral ${settings.minMagnitude}`}
        />
        {visibleEarthquakes.map((earthquake) => (
          <EarthquakeCard key={earthquake.id} earthquake={earthquake} />
        ))}
        {!loading && visibleEarthquakes.length === 0 ? (
          <Text style={styles.empty}>No hay sismos que superen el umbral configurado.</Text>
        ) : null}

        {strongest ? (
          <>
            <SectionTitle title="Mayor sismo registrado recientemente" />
            <EarthquakeCard earthquake={strongest} />
          </>
        ) : null}

        <SectionTitle title="Actividad reciente" caption="Últimas 24 horas" />
        <View style={styles.metrics}>
          <MetricCard label="Sismos" value={`${last24h.length}`} hint="Registrados" />
          <MetricCard
            label="Perceptibles"
            value={`${perceptible}`}
            hint="Magnitud 4.0+"
            accent="#FB923C"
          />
          <MetricCard
            label="Última alerta"
            value={earthquakes[0]?.timeAgo ?? '—'}
            hint="Desde Firestore"
          />
        </View>
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
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    color: colors.success,
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
    marginBottom: spacing.sm,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
