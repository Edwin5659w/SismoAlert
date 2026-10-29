import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerSlot } from '../components/ads/BannerSlot';
import { CompactQuakeRow } from '../components/home/CompactQuakeRow';
import { LatestQuakeCard } from '../components/home/LatestQuakeCard';
import { PreparednessCard } from '../components/home/PreparednessCard';
import { ZoneLevel, ZoneStatusCard } from '../components/home/ZoneStatusCard';
import { SosButton } from '../components/safety/SosButton';
import { useAds } from '../context/AdsContext';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { tipOfTheDay } from '../data/preparedness';
import { runEarthquakeSync, useEarthquakeSyncStatus } from '../hooks/useEarthquakeSync';
import { refreshLocation } from '../hooks/useUserLocation';
import { formatDistance, parseRadiusKm, quakeDistanceKm } from '../lib/geo';
import { magnitudeColor } from '../lib/magnitude';
import { preparednessScore } from '../lib/preparedness';
import { saveUserSettings } from '../services/userSettings';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

type IconName = keyof typeof Ionicons.glyphMap;
const DAY_MS = 24 * 60 * 60 * 1000;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickAction({ icon, label, tint, onPress }: { icon: IconName; label: string; tint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quick, pressed && styles.quickPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function Metric({ value, label, color = colors.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { user } = useAuth();
  const {
    userName,
    settings,
    earthquakes,
    earthquakesLoading,
    earthquakesError,
    location,
    contacts,
    medical,
    preparedness,
    openSos,
    startDrill,
  } = useSafety();
  const syncStatus = useEarthquakeSyncStatus();
  const { registerInterstitialOpportunity } = useAds();
  const openDetail = (id: string) => {
    registerInterstitialOpportunity();
    navigation.navigate('Detalle', { id });
  };

  const radiusKm = parseRadiusKm(settings.alertRadius);
  const here = location.location;

  const withDistance = useMemo(
    () => earthquakes.map((earthquake) => ({ earthquake, distanceKm: quakeDistanceKm(earthquake, here) })),
    [earthquakes, here],
  );

  const last24h = useMemo(
    () => withDistance.filter(({ earthquake }) => Date.now() - earthquake.occurredAt <= DAY_MS),
    [withDistance],
  );
  const nearby24h = last24h.filter(({ distanceKm }) => distanceKm !== undefined && distanceKm <= radiusKm);
  const strongestNear = nearby24h.reduce<number | undefined>(
    (max, { earthquake }) => (max === undefined || earthquake.magnitude > max ? earthquake.magnitude : max),
    undefined,
  );
  const nearest = [...withDistance]
    .filter(({ distanceKm }) => distanceKm !== undefined)
    .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number))[0];

  const level: ZoneLevel =
    (strongestNear ?? 0) >= 5 ? 'high' : (strongestNear ?? 0) >= 4 || nearby24h.length >= 3 ? 'moderate' : 'calm';

  const latest = withDistance[0];
  const strongest24 = last24h.reduce<number | undefined>(
    (max, { earthquake }) => (max === undefined || earthquake.magnitude > max ? earthquake.magnitude : max),
    undefined,
  );
  const perceptible = last24h.filter(({ earthquake }) => earthquake.magnitude >= 4).length;

  // "Cerca de ti": los más cercanos dentro del radio; si no hay ubicación, los más recientes.
  const nearbyList = here
    ? withDistance
        .filter(({ distanceKm }) => distanceKm !== undefined && distanceKm <= radiusKm)
        .slice(0, 5)
    : withDistance.slice(1, 6);

  const score = preparednessScore(contacts, medical, preparedness);

  const enableLocation = async () => {
    if (!user) return;
    if (!settings.gpsEnabled) {
      await saveUserSettings(user.uid, { ...settings, gpsEnabled: true }).catch(() => undefined);
    }
    refreshLocation(true);
  };

  const firstName = userName.split(' ')[0];
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={syncStatus.state === 'syncing'}
            onRefresh={() => {
              runEarthquakeSync(true);
              if (settings.gpsEnabled) refreshLocation(true);
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Saludo */}
        <View style={styles.topBar}>
          <View style={styles.flex}>
            <Text style={styles.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
            <Text style={styles.hello}>
              {greeting()}, <Text style={styles.helloName}>{firstName}</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Configuracion')}
            style={styles.avatar}
            accessibilityLabel="Perfil y ajustes"
          >
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: syncStatus.state === 'error' ? colors.danger : colors.success }]} />
          <Text style={styles.liveText}>
            {syncStatus.state === 'syncing'
              ? 'Actualizando sismos…'
              : syncStatus.state === 'error'
                ? 'Sin conexión con la fuente de sismos'
                : `Monitoreo activo · ${syncStatus.source ?? 'SGC'}`}
          </Text>
        </View>

        {/* Estado de la zona */}
        <ZoneStatusCard
          locationStatus={location.status === 'off' ? 'off' : here ? 'ready' : location.status}
          city={here?.city}
          level={level}
          nearbyCount={nearby24h.length}
          radiusLabel={settings.alertRadius}
          strongestLabel={strongestNear !== undefined ? `M${strongestNear.toFixed(1)}` : undefined}
          nearestLabel={
            nearest
              ? `El epicentro más cercano registrado está ${formatDistance(nearest.distanceKm)} (${nearest.earthquake.location}).`
              : undefined
          }
          onEnableLocation={enableLocation}
        />

        {/* SOS + accesos rápidos */}
        <View style={styles.sosCard}>
          <SosButton compact onActivate={openSos} />
          <View style={styles.flex}>
            <Text style={styles.sosTitle}>¿Emergencia?</Text>
            <Text style={styles.sosText}>
              Mantén presionado SOS para llamar al 123 y avisar a tus contactos con tu ubicación.
            </Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction icon="school" label="Simulacro" tint={colors.warning} onPress={startDrill} />
          <QuickAction icon="people" label="Contactos" tint={colors.accent} onPress={() => navigation.navigate('ContactosConfianza')} />
          <QuickAction icon="briefcase" label="Mi kit" tint="#A78BFA" onPress={() => navigation.navigate('Preparacion')} />
          <QuickAction icon="book" label="Guía" tint={colors.success} onPress={() => navigation.navigate('Guia')} />
        </View>

        {/* Último sismo */}
        <SectionHeader title="Último sismo" action="Ver todos" onAction={() => navigation.navigate('Sismos')} />
        {earthquakesLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
        {earthquakesError ? <Text style={styles.error}>{earthquakesError}</Text> : null}
        {latest ? (
          <LatestQuakeCard
            earthquake={latest.earthquake}
            distanceKm={latest.distanceKm}
            onPress={() => openDetail(latest.earthquake.id)}
          />
        ) : !earthquakesLoading ? (
          <Text style={styles.empty}>Aún no hay sismos registrados. Desliza hacia abajo para actualizar.</Text>
        ) : null}

        {/* Actividad 24 h */}
        <SectionHeader title="Últimas 24 horas" />
        <View style={styles.metrics}>
          <Metric value={`${last24h.length}`} label="Sismos" />
          <View style={styles.metricDivider} />
          <Metric value={`${perceptible}`} label="Sentidos (M4+)" color={colors.warning} />
          <View style={styles.metricDivider} />
          <Metric
            value={strongest24 !== undefined ? strongest24.toFixed(1) : '—'}
            label="Mayor magnitud"
            color={strongest24 !== undefined ? magnitudeColor(strongest24) : colors.text}
          />
        </View>

        {/* Cerca de ti */}
        <SectionHeader
          title={here ? `Cerca de ti · ${settings.alertRadius}` : 'Más recientes'}
          action="Mapa"
          onAction={() => navigation.navigate('Mapa')}
        />
        <View style={styles.listCard}>
          {nearbyList.length ? (
            nearbyList.map(({ earthquake, distanceKm }, index) => (
              <CompactQuakeRow
                key={earthquake.id}
                earthquake={earthquake}
                distanceKm={distanceKm}
                last={index === nearbyList.length - 1}
                onPress={() => openDetail(earthquake.id)}
              />
            ))
          ) : (
            <View style={styles.listEmpty}>
              <Ionicons name="happy-outline" size={22} color={colors.success} />
              <Text style={styles.listEmptyText}>
                No hay sismos registrados a menos de {settings.alertRadius} de ti.
              </Text>
            </View>
          )}
        </View>

        {/* Preparación */}
        <SectionHeader title="Prepárate" />
        <PreparednessCard
          percent={score.percent}
          checks={score.checks}
          onOpen={(check) => (check.id === 'drill' ? startDrill() : navigation.navigate(check.route as never))}
        />

        {/* Consejo */}
        <View style={styles.tip}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.tipKicker}>CONSEJO DEL DÍA</Text>
            <Text style={styles.tipText}>{tipOfTheDay()}</Text>
          </View>
        </View>

        <BannerSlot />
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
    paddingBottom: spacing.xl * 1.5,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  date: {
    color: colors.muted,
    fontSize: 13,
  },
  hello: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  helloName: {
    color: colors.accent,
    fontWeight: '900',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    color: colors.muted,
    fontSize: 12.5,
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sosTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sosText: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  quickPressed: {
    backgroundColor: colors.surface,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginVertical: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.muted,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  listEmptyText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipKicker: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tipText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
