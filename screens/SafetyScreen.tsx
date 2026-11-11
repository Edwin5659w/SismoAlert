import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { NavRow } from '../components/NavRow';
import { SosButton } from '../components/safety/SosButton';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { KIT_TOTAL } from '../data/preparedness';
import { formatTimeAgo } from '../lib/time';
import { CheckInRecord, subscribeCheckIns } from '../services/safety';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

const STATUS_META = {
  safe: { label: 'Estaba bien', icon: 'checkmark-circle' as const, color: colors.success },
  help: { label: 'Pidió ayuda', icon: 'hand-left' as const, color: colors.danger },
  'no-response': { label: 'No respondió', icon: 'alert-circle' as const, color: colors.warning },
};

export function SafetyScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { user } = useAuth();
  const { openSos, startDrill, safetySettings, settings, contacts, medical, preparedness, location } =
    useSafety();
  const [history, setHistory] = useState<CheckInRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeCheckIns(user.uid, setHistory);
  }, [user]);

  const active = safetySettings.checkInEnabled && settings.alertsEnabled;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Centro de seguridad" subtitle="Tu plan para antes, durante y después" />

        <View style={styles.sosCard}>
          <SosButton onActivate={openSos} />
          <Text style={styles.sosCaption}>
            Llama al 123 y avisa a tus {contacts.length || ''} contactos de confianza con tu ubicación
            {location.location ? '' : ' (activa la ubicación para incluirla)'}.
          </Text>
        </View>

        <View style={[styles.checkCard, active ? styles.checkActive : styles.checkInactive]}>
          <View style={styles.checkHeader}>
            <View style={[styles.checkIcon, { backgroundColor: active ? colors.accentSoft : colors.surface }]}>
              <Ionicons name="shield-checkmark" size={22} color={active ? colors.accent : colors.muted} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.checkTitle}>Modo "¿Estás bien?"</Text>
              <Text style={[styles.checkState, { color: active ? colors.success : colors.muted }]}>
                {active ? 'Activado' : 'Desactivado'}
              </Text>
            </View>
          </View>
          <Text style={styles.checkText}>
            Si ocurre un sismo de magnitud {safetySettings.checkInMagnitude} a menos de{' '}
            {settings.alertRadius} de ti, sonará una alarma y te preguntaremos si estás bien. Si no
            respondes en {safetySettings.checkInMinutes} min, avisamos a tus contactos y dejamos el 123
            listo para llamar.
          </Text>
          {!location.location && active ? (
            <Text style={styles.warning}>
              Sin ubicación solo se activa con sismos de magnitud 6.0 o más.
            </Text>
          ) : null}
          <View style={styles.checkButtons}>
            <Pressable onPress={startDrill} style={[styles.checkButton, styles.checkButtonPrimary]}>
              <Ionicons name="school" size={16} color={colors.onAccent} />
              <Text style={styles.checkButtonPrimaryText}>Hacer simulacro</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Configuracion')} style={styles.checkButton}>
              <Ionicons name="options" size={16} color={colors.accent} />
              <Text style={styles.checkButtonText}>Ajustar</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Tu red de apoyo</Text>
        <NavRow
          icon="people"
          title="Contactos de confianza"
          caption="Reciben tu ubicación si necesitas ayuda"
          status={`${contacts.length}`}
          statusColor={contacts.length ? colors.success : colors.danger}
          onPress={() => navigation.navigate('ContactosConfianza')}
        />
        <NavRow
          icon="medical"
          title="Ficha de emergencia"
          caption="Tipo de sangre, alergias y medicamentos"
          status={medical?.bloodType ? 'Lista' : 'Pendiente'}
          statusColor={medical?.bloodType ? colors.success : colors.warning}
          tint={colors.danger}
          onPress={() => navigation.navigate('FichaMedica')}
        />
        <NavRow
          icon="briefcase"
          title="Kit y plan familiar"
          caption={preparedness.meetingPoint ? `Encuentro: ${preparedness.meetingPoint}` : 'Mochila de 72 horas y punto de encuentro'}
          status={`${preparedness.kit.length}/${KIT_TOTAL}`}
          tint="#A78BFA"
          onPress={() => navigation.navigate('Preparacion')}
        />

        <Text style={styles.section}>Información útil</Text>
        <NavRow
          icon="book"
          title="Guía: qué hacer en un sismo"
          caption="Antes, durante y después"
          tint={colors.success}
          onPress={() => navigation.navigate('Guia')}
        />
        <NavRow
          icon="call"
          title="Líneas de emergencia"
          caption="123, Defensa Civil, Bomberos, Cruz Roja"
          tint={colors.warning}
          onPress={() => navigation.navigate('Contactos')}
        />

        {history.length ? (
          <>
            <Text style={styles.section}>Historial</Text>
            <View style={styles.history}>
              {history.map((item, index) => {
                const meta = STATUS_META[item.status] ?? STATUS_META['no-response'];
                return (
                  <View key={item.id} style={[styles.historyRow, index > 0 && styles.historyBorder]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                    <View style={styles.flex}>
                      <Text style={styles.historyTitle}>
                        {meta.label}
                        {item.drill ? ' · simulacro' : ''}
                      </Text>
                      <Text style={styles.historyMeta} numberOfLines={1}>
                        M{item.magnitude.toFixed(1)} · {item.place}
                      </Text>
                    </View>
                    <Text style={styles.historyTime}>{formatTimeAgo(item.createdAt)}</Text>
                  </View>
                );
              })}
            </View>
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
    paddingBottom: spacing.xl * 1.5,
  },
  flex: {
    flex: 1,
  },
  sosCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sosCaption: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  checkCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  checkActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.06)',
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  checkInactive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  checkState: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  checkText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  warning: {
    color: colors.warning,
    fontSize: 12.5,
    marginTop: spacing.sm,
  },
  checkButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 11,
  },
  checkButtonPrimary: {
    backgroundColor: colors.accent,
  },
  checkButtonPrimaryText: {
    color: colors.onAccent,
    fontWeight: '800',
  },
  checkButtonText: {
    color: colors.accent,
    fontWeight: '700',
  },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  history: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  historyBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  historyTime: {
    color: colors.mutedDim,
    fontSize: 11.5,
  },
});
