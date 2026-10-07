import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { OptionPills } from '../components/OptionPills';
import { SectionTitle } from '../components/SectionTitle';
import { SettingItem } from '../components/SettingItem';
import { useAuth } from '../context/AuthContext';
import { defaultSettings, saveUserSettings, subscribeUserSettings } from '../services/userSettings';
import { colors, radius, spacing } from '../theme';
import { UserSettings } from '../types';

const MAGNITUDE_OPTIONS = ['3.0+', '4.0+', '5.0+'];
const RADIUS_OPTIONS = ['20 km', '100 km', '150 km', '300 km'];

export function SettingsScreen() {
  const { user, logout } = useAuth();
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title="Configuración"
          subtitle={saving ? 'Guardando en Firebase…' : 'Preferencias sincronizadas'}
        />

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

        <SectionTitle title="Magnitud mínima" caption="Mostrar sismos a partir de este valor" />
        <SettingItem title="Umbral de magnitud">
          <OptionPills
            options={MAGNITUDE_OPTIONS}
            selected={settings.minMagnitude}
            onSelect={(minMagnitude) => updateSettings({ ...settings, minMagnitude })}
          />
        </SettingItem>

        <SectionTitle title="Ubicación" />
        <SettingItem
          title="Activar ubicación / GPS"
          description="Usar tu posición para ajustar el radio de alerta."
          value={settings.gpsEnabled}
          onValueChange={(gpsEnabled) => updateSettings({ ...settings, gpsEnabled })}
        />

        <SectionTitle title="Radio de alerta" />
        <SettingItem title="Distancia máxima">
          <OptionPills
            options={RADIUS_OPTIONS}
            selected={settings.alertRadius}
            onSelect={(alertRadius) => updateSettings({ ...settings, alertRadius })}
          />
        </SettingItem>

        <Pressable style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
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
  logout: {
    marginTop: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
