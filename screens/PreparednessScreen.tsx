import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '../components/BackHeader';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { KIT_GROUPS, KIT_TOTAL } from '../data/preparedness';
import { shareMessage } from '../lib/emergency';
import { formatLocalTime } from '../lib/time';
import { savePreparedness } from '../services/safety';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

type Props = BottomTabScreenProps<RootTabParamList, 'Preparacion'>;

export function PreparednessScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { preparedness, startDrill } = useSafety();
  const [meetingPoint, setMeetingPoint] = useState(preparedness.meetingPoint);
  const [familyPlan, setFamilyPlan] = useState(preparedness.familyPlan);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMeetingPoint(preparedness.meetingPoint);
    setFamilyPlan(preparedness.familyPlan);
  }, [preparedness.meetingPoint, preparedness.familyPlan]);

  const checked = new Set(preparedness.kit);
  const percent = Math.round((checked.size / KIT_TOTAL) * 100);

  const toggle = (id: string) => {
    if (!user) return;
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    savePreparedness(user.uid, { ...preparedness, kit: [...next] }).catch(() => undefined);
  };

  const savePlan = async () => {
    if (!user) return;
    await savePreparedness(user.uid, {
      ...preparedness,
      meetingPoint: meetingPoint.slice(0, 200),
      familyPlan: familyPlan.slice(0, 1000),
    }).catch(() => undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const planChanged = meetingPoint !== preparedness.meetingPoint || familyPlan !== preparedness.familyPlan;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader title="Kit y plan familiar" subtitle="Prepárate antes de que tiemble" onBack={() => navigation.goBack()} />

          {/* Resumen del kit */}
          <View style={styles.summary}>
            <View style={styles.flex}>
              <Text style={styles.summaryTitle}>Mochila para 72 horas</Text>
              <Text style={styles.summaryCaption}>
                {checked.size} de {KIT_TOTAL} elementos listos
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
            </View>
            <Text style={styles.summaryPercent}>{percent}%</Text>
          </View>

          {KIT_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <View style={styles.groupHeader}>
                <Ionicons name={group.icon} size={18} color="#A78BFA" />
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              {group.items.map((item) => {
                const done = checked.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                  >
                    <View style={[styles.checkbox, done && styles.checkboxOn]}>
                      {done ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.itemLabel, done && styles.itemDone]}>{item.label}</Text>
                      {item.hint ? <Text style={styles.itemHint}>{item.hint}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Plan familiar */}
          <Text style={styles.section}>Plan familiar</Text>
          <View style={styles.planCard}>
            <Text style={styles.label}>Punto de encuentro</Text>
            <TextInput
              value={meetingPoint}
              onChangeText={setMeetingPoint}
              placeholder="Ej. Parque principal, frente a la iglesia"
              placeholderTextColor={colors.mutedDim}
              style={styles.input}
              maxLength={200}
              selectionColor={colors.accent}
            />
            <Text style={[styles.label, { marginTop: spacing.md }]}>Qué hace cada persona</Text>
            <TextInput
              value={familyPlan}
              onChangeText={setFamilyPlan}
              placeholder="Ej. Papá cierra el gas, yo recojo a la abuela, nos vemos en el punto de encuentro"
              placeholderTextColor={colors.mutedDim}
              style={[styles.input, styles.inputMultiline]}
              multiline
              maxLength={1000}
              selectionColor={colors.accent}
            />
            <View style={styles.planButtons}>
              <Pressable
                onPress={savePlan}
                disabled={!planChanged}
                style={[styles.saveButton, !planChanged && styles.disabled]}
              >
                <Text style={styles.saveText}>{saved ? 'Guardado' : 'Guardar plan'}</Text>
              </Pressable>
              {preparedness.meetingPoint ? (
                <Pressable
                  onPress={() =>
                    shareMessage(
                      `Nuestro plan ante un sismo:\nPunto de encuentro: ${preparedness.meetingPoint}${
                        preparedness.familyPlan ? `\n${preparedness.familyPlan}` : ''
                      }\nLínea de emergencias: 123`,
                    )
                  }
                  style={styles.shareButton}
                >
                  <Ionicons name="share-social" size={16} color={colors.accent} />
                  <Text style={styles.shareText}>Compartir</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Simulacro */}
          <Text style={styles.section}>Simulacro</Text>
          <View style={styles.drillCard}>
            <Ionicons name="school" size={26} color={colors.warning} />
            <View style={styles.flex}>
              <Text style={styles.drillTitle}>Practica el modo "¿Estás bien?"</Text>
              <Text style={styles.drillText}>
                {preparedness.lastDrillAt
                  ? `Último simulacro: ${formatLocalTime(preparedness.lastDrillAt)}`
                  : 'Aún no has hecho un simulacro.'}
              </Text>
            </View>
            <Pressable onPress={startDrill} style={styles.drillButton}>
              <Text style={styles.drillButtonText}>Iniciar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 1.5,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    padding: spacing.md,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryCaption: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: 2,
  },
  summaryPercent: {
    color: '#A78BFA',
    fontSize: 28,
    fontWeight: '900',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#A78BFA',
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  itemPressed: {
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  itemLabel: {
    color: colors.text,
    fontSize: 14.5,
  },
  itemDone: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  itemHint: {
    color: colors.mutedDim,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  planButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  saveText: {
    color: colors.onAccent,
    fontWeight: '800',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  shareText: {
    color: colors.accent,
    fontWeight: '700',
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    padding: spacing.md,
  },
  drillTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14.5,
  },
  drillText: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: 2,
  },
  drillButton: {
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  drillButtonText: {
    color: '#3B2A00',
    fontWeight: '800',
  },
});
