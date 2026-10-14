import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { OptionPills } from '../components/OptionPills';
import { SectionTitle } from '../components/SectionTitle';
import { SettingItem } from '../components/SettingItem';
import { useAuth } from '../context/AuthContext';
import { runEarthquakeSync, useEarthquakeSyncStatus } from '../hooks/useEarthquakeSync';
import { useEarthquakes } from '../hooks/useEarthquakes';
import { parseMagnitude } from '../lib/magnitude';
import { formatTimeAgo } from '../lib/time';
import { defaultSettings, saveUserSettings, subscribeUserSettings } from '../services/userSettings';
import { colors, radius, spacing } from '../theme';
import { UserSettings } from '../types';

const MAGNITUDE_OPTIONS = ['3.0+', '4.0+', '5.0+'];
const RADIUS_OPTIONS = ['20 km', '100 km', '150 km', '300 km'];

export function AlertsScreen() {
  const { user } = useAuth();
  const { earthquakes } = useEarthquakes();
  const syncStatus = useEarthquakeSyncStatus();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    return subscribeUserSettings(user.uid, setSettings);
  }, [user]);

  const updateSettings = async (next: UserSettings) => {
    if (!user) {
      return;
    }
    setSettings(next);
    setSaving(true);
    try {
      await saveUserSettings(user.uid, next);
    } finally {
      setSaving(false);
    }
  };

  const threshold = parseMagnitude(settings.minMagnitude);
  const triggering = earthquakes.filter((item) => item.magnitude >= threshold).length;
  const syncing = syncStatus.state === 'syncing';
  const syncLabel =
    syncStatus.state === 'ok'
      ? `${syncStatus.count ?? 0} sismos desde ${syncStatus.source ?? 'la fuente'}`
      : syncStatus.state === 'error'
        ? syncStatus.message ?? 'Error de sincronización'
        : syncing
          ? 'Sincronizando…'
          : 'Aún sin sincronizar';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title="Centro de alertas"
          subtitle={saving ? 'Guardando en Firebase…' : 'Umbrales y sincronización'}
        />

        <SectionTitle title="Estado de sincronización" caption="Base de datos Firestore" />
        <SettingItem
          title={syncLabel}
          description={
            syncStatus.syncedAt
              ? `Última sincronización: ${formatTimeAgo(syncStatus.syncedAt)}`
              : 'Fuente: Servicio Geológico Colombiano (respaldo USGS)'
          }
        >
          <Pressable
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={() => runEarthquakeSync(true)}
            disabled={syncing}
          >
            <Text style={styles.syncText}>{syncing ? 'Sincronizando…' : 'Sincronizar ahora'}</Text>
          </Pressable>
        </SettingItem>

        <SectionTitle title="Alertas" />
        <SettingItem
          title="Alertas sísmicas"
          description="Recibir avisos cuando se registre un sismo."
          value={settings.alertsEnabled}
          onValueChange={(alertsEnabled) => updateSettings({ ...settings, alertsEnabled })}
        />
        <SettingItem
          title="Alertas importantes"
          description="Priorizar eventos de mayor magnitud."
          value={settings.importantAlerts}
          onValueChange={(importantAlerts) => updateSettings({ ...settings, importantAlerts })}
        />

        <SectionTitle
          title="Umbral de magnitud"
          caption={`${triggering} sismos registrados superan el umbral`}
        />
        <SettingItem title="Magnitud mínima">
          <OptionPills
            options={MAGNITUDE_OPTIONS}
            selected={settings.minMagnitude}
            onSelect={(minMagnitude) => updateSettings({ ...settings, minMagnitude })}
          />
        </SettingItem>

        <SectionTitle title="Radio de alerta" />
        <SettingItem title="Distancia máxima">
          <OptionPills
            options={RADIUS_OPTIONS}
            selected={settings.alertRadius}
            onSelect={(alertRadius) => updateSettings({ ...settings, alertRadius })}
          />
        </SettingItem>
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
  syncButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    paddingVertical: 12,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncText: {
    color: colors.accent,
    fontWeight: '700',
  },
});
