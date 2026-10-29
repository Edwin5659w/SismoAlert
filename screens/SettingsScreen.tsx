import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { NavRow } from '../components/NavRow';
import { OptionPills } from '../components/OptionPills';
import { SettingItem } from '../components/SettingItem';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { refreshLocation } from '../hooks/useUserLocation';
import { saveSafetySettings } from '../services/safety';
import { saveUserSettings } from '../services/userSettings';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList, SafetySettings } from '../types';

const CHECKIN_MAGNITUDES = ['4.5+', '5.0+', '5.5+', '6.0+'];
const CHECKIN_MINUTES = ['1 min', '3 min', '5 min', '10 min'];

export function SettingsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { user, logout } = useAuth();
  const { settings, safetySettings, location, userName } = useSafety();
  const [saving, setSaving] = useState(false);

  const run = async (task: Promise<unknown>) => {
    setSaving(true);
    try {
      await task;
    } catch (error) {
      console.warn('No se pudo guardar el ajuste.', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSafety = (next: Partial<SafetySettings>) => {
    if (!user) return;
    run(saveSafetySettings(user.uid, { ...safetySettings, ...next }));
  };

  const toggleGps = (gpsEnabled: boolean) => {
    if (!user) return;
    run(saveUserSettings(user.uid, { ...settings, gpsEnabled }));
    if (gpsEnabled) refreshLocation(true);
  };

  const locationCaption =
    !settings.gpsEnabled
      ? 'Desactivada: no podemos calcular a qué distancia ocurren los sismos.'
      : location.status === 'denied'
        ? 'Permiso denegado. Actívalo en los ajustes del teléfono.'
        : location.location
          ? `Ubicación actual: ${location.location.city ?? 'detectada'}`
          : 'Buscando tu ubicación…';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Perfil y ajustes" subtitle={saving ? 'Guardando en Firebase…' : 'Preferencias sincronizadas'} />

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          {user?.emailVerified ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          ) : null}
        </View>

        <Text style={styles.section}>Alertas</Text>
        <NavRow
          icon="notifications"
          title="Alertas y sincronización"
          caption={`Magnitud ${settings.minMagnitude} · radio ${settings.alertRadius}`}
          status={settings.alertsEnabled ? 'Activas' : 'Apagadas'}
          statusColor={settings.alertsEnabled ? colors.success : colors.muted}
          onPress={() => navigation.navigate('Alertas')}
        />

        <SettingItem
          title="Usar mi ubicación"
          description={locationCaption}
          value={settings.gpsEnabled}
          onValueChange={toggleGps}
        />

        <Text style={styles.section}>Modo "¿Estás bien?"</Text>
        <SettingItem
          title="Preguntar si estoy bien después de un sismo"
          description="Suena una alarma y, si no respondes, se avisa a tus contactos de confianza."
          value={safetySettings.checkInEnabled}
          onValueChange={(checkInEnabled) => updateSafety({ checkInEnabled })}
        />
        <SettingItem title="Activar con sismos de magnitud" description="Y que ocurran dentro de tu radio de alerta.">
          <OptionPills
            options={CHECKIN_MAGNITUDES}
            selected={safetySettings.checkInMagnitude}
            onSelect={(checkInMagnitude) => updateSafety({ checkInMagnitude })}
          />
        </SettingItem>
        <SettingItem title="Tiempo para responder">
          <OptionPills
            options={CHECKIN_MINUTES}
            selected={`${safetySettings.checkInMinutes} min`}
            onSelect={(value) => updateSafety({ checkInMinutes: Number.parseInt(value, 10) })}
          />
        </SettingItem>
        <SettingItem
          title="Avisar automáticamente a contactos vinculados"
          description="Envía una notificación a los contactos que también usan SismoAlert."
          value={safetySettings.notifyLinkedContacts}
          onValueChange={(notifyLinkedContacts) => updateSafety({ notifyLinkedContacts })}
        />

        <Text style={styles.section}>Seguridad</Text>
        <NavRow icon="people" title="Contactos de confianza" onPress={() => navigation.navigate('ContactosConfianza')} />
        <NavRow icon="medical" title="Ficha de emergencia" tint={colors.danger} onPress={() => navigation.navigate('FichaMedica')} />

        <Pressable style={styles.logout} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.footer}>
          SismoAlert · Datos del Servicio Geológico Colombiano (respaldo USGS).{'\n'}
          En una emergencia llama al 123.
        </Text>
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  email: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  logout: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
  footer: {
    color: colors.mutedDim,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 17,
  },
});
