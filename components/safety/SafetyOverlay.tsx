import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafety } from '../../context/SafetyContext';
import { formatDistance } from '../../lib/geo';
import { shareOnWhatsApp, textContacts } from '../../lib/emergency';
import { maybeAskForReview } from '../../lib/review';
import { colors, radius, spacing } from '../../theme';
import { EmergencyActions } from './EmergencyActions';
import { MedicalCardView } from './MedicalCardView';

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function DrillBadge() {
  return (
    <View style={styles.drill}>
      <Ionicons name="school" size={13} color={colors.warning} />
      <Text style={styles.drillText}>SIMULACRO</Text>
    </View>
  );
}

/** Pantalla completa del modo "¿Estás bien?" y del SOS. Se muestra sobre cualquier pantalla. */
export function SafetyOverlay() {
  const { checkIn, respond, dismiss, medical, userName, contacts, helpMessage } = useSafety();
  const { phase, trigger } = checkIn;
  const now = useNow(phase === 'asking');
  const pulse = useRef(new Animated.Value(0)).current;
  const [showMedical, setShowMedical] = useState(false);

  useEffect(() => {
    if (phase !== 'asking') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  useEffect(() => {
    if (phase === 'idle') setShowMedical(false);
  }, [phase]);

  if (phase === 'idle') return null;

  const quake = trigger?.earthquake;
  const quakeLine = quake
    ? `M${quake.magnitude.toFixed(1)} · ${quake.location}${
        trigger?.distanceKm !== undefined && !trigger.drill ? ` · ${formatDistance(trigger.distanceKm)}` : ''
      }`
    : '';

  const remaining = checkIn.deadline - now;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => (phase === 'asking' ? undefined : dismiss())}>
      <View style={[styles.root, phase === 'asking' && styles.rootAlert]}>
        {phase === 'asking' ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]}
          />
        ) : null}
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {phase === 'asking' ? (
              <View style={styles.askBlock}>
                {trigger?.drill ? <DrillBadge /> : null}
                <View style={styles.alertIcon}>
                  <Ionicons name="pulse" size={40} color="#fff" />
                </View>
                <Text style={styles.kicker}>SISMO DETECTADO</Text>
                <Text style={styles.bigTitle}>¿Estás bien?</Text>
                <Text style={styles.quakeLine}>{quakeLine}</Text>

                <View style={styles.countdown}>
                  <Text style={styles.countdownValue}>{formatCountdown(remaining)}</Text>
                  <Text style={styles.countdownLabel}>
                    Si no respondes, avisaremos a tus contactos de confianza
                  </Text>
                </View>

                <Pressable
                  onPress={() => respond('safe')}
                  style={({ pressed }) => [styles.safeButton, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="checkmark-circle" size={28} color={colors.onAccent} />
                  <Text style={styles.safeButtonText}>Estoy bien</Text>
                </Pressable>
                <Pressable
                  onPress={() => respond('help')}
                  style={({ pressed }) => [styles.helpButton, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="hand-left" size={24} color="#fff" />
                  <Text style={styles.helpButtonText}>Necesito ayuda</Text>
                </Pressable>
              </View>
            ) : null}

            {phase === 'escalated' || phase === 'sos' ? (
              <View>
                <View style={styles.topRow}>
                  {trigger?.drill ? <DrillBadge /> : <View />}
                  {phase === 'sos' ? (
                    <Pressable onPress={dismiss} hitSlop={12} accessibilityLabel="Cerrar">
                      <Ionicons name="close" size={26} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={[styles.alertIcon, styles.alertIconSmall]}>
                  <Ionicons name="warning" size={28} color="#fff" />
                </View>
                <Text style={styles.title}>
                  {phase === 'sos'
                    ? 'Modo SOS'
                    : checkIn.reason === 'help'
                      ? 'Pediste ayuda'
                      : 'No recibimos respuesta'}
                </Text>
                <Text style={styles.subtitle}>
                  {phase === 'sos'
                    ? 'Elige cómo pedir ayuda. Tus mensajes incluyen tu ubicación.'
                    : quakeLine}
                </Text>
                {checkIn.notifiedCount ? (
                  <View style={styles.notice}>
                    <Ionicons name="checkmark-done" size={16} color={colors.success} />
                    <Text style={styles.noticeText}>
                      Avisamos automáticamente a {checkIn.notifiedCount} contacto
                      {checkIn.notifiedCount === 1 ? '' : 's'} con SismoAlert.
                    </Text>
                  </View>
                ) : null}

                <EmergencyActions kind={phase === 'escalated' && checkIn.reason === 'no-response' ? 'no-response' : 'help'} />

                {medical ? (
                  <View style={styles.medicalBlock}>
                    <Pressable onPress={() => setShowMedical((value) => !value)} style={styles.medicalToggle}>
                      <Ionicons name="medkit" size={18} color={colors.accent} />
                      <Text style={styles.medicalToggleText}>
                        {showMedical ? 'Ocultar ficha de emergencia' : 'Mostrar ficha a rescatistas'}
                      </Text>
                    </Pressable>
                    {showMedical ? <MedicalCardView name={userName} info={medical} /> : null}
                  </View>
                ) : null}

                {phase === 'escalated' ? (
                  <Pressable onPress={() => respond('safe')} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Estoy bien, cancelar alerta</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {phase === 'safe' ? (
              <View style={styles.askBlock}>
                <View style={[styles.alertIcon, styles.safeIcon]}>
                  <Ionicons name="checkmark" size={44} color={colors.onAccent} />
                </View>
                <Text style={styles.bigTitle}>¡Qué bueno!</Text>
                <Text style={styles.quakeLine}>
                  Registramos que estás bien. Prepárate para posibles réplicas.
                </Text>

                <View style={styles.tips}>
                  {[
                    'Revisa si hay heridos y daños a tu alrededor.',
                    'Si hay olor a gas, no enciendas luces y sal del lugar.',
                    'Aléjate de muros agrietados, vidrios y cables caídos.',
                  ].map((tip) => (
                    <View key={tip} style={styles.tipRow}>
                      <Ionicons name="ellipse" size={6} color={colors.accent} style={{ marginTop: 7 }} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>

                {contacts.length ? (
                  <Pressable
                    onPress={() => textContacts(contacts, helpMessage('safe'))}
                    style={styles.secondaryButton}
                  >
                    <Ionicons name="chatbubbles" size={18} color={colors.accent} />
                    <Text style={styles.secondaryText}>Avisar a mis contactos que estoy bien</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => shareOnWhatsApp(helpMessage('safe'))} style={styles.secondaryButton}>
                  <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
                  <Text style={styles.secondaryText}>Contarlo por WhatsApp</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    dismiss();
                    // Buen momento: la persona está bien y la app le ayudó.
                    maybeAskForReview();
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeText}>Cerrar</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rootAlert: {
    backgroundColor: '#2A0A12',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.danger,
  },
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  askBlock: {
    alignItems: 'center',
  },
  drill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  drillText: {
    color: colors.warning,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  alertIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  alertIconSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  safeIcon: {
    backgroundColor: colors.success,
  },
  kicker: {
    color: '#FDA4AF',
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 12,
  },
  bigTitle: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  quakeLine: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  countdown: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  countdownValue: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    color: '#FDA4AF',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  safeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.xl,
    paddingVertical: 20,
    alignSelf: 'stretch',
  },
  safeButtonText: {
    color: colors.onAccent,
    fontSize: 22,
    fontWeight: '900',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderColor: colors.danger,
    borderWidth: 2,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.success,
    flex: 1,
    fontSize: 13,
  },
  medicalBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  medicalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingVertical: 6,
  },
  medicalToggleText: {
    color: colors.accent,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.success,
    fontWeight: '700',
  },
  tips: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
    marginVertical: spacing.lg,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: spacing.sm,
    paddingVertical: 12,
  },
  closeText: {
    color: colors.muted,
    fontWeight: '700',
  },
});
