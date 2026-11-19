import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormMessage, FormMessageValue } from '../components/auth/FormMessage';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { BackHeader } from '../components/BackHeader';
import { MedicalCardView } from '../components/safety/MedicalCardView';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { emptyMedicalInfo, saveMedicalInfo } from '../services/safety';
import { colors, radius, spacing } from '../theme';
import { MedicalInfo, RootTabParamList } from '../types';

type Props = BottomTabScreenProps<RootTabParamList, 'FichaMedica'>;

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'No sé'];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedDim}
        multiline={multiline}
        maxLength={multiline ? 500 : 100}
        style={[styles.input, multiline && styles.inputMultiline]}
        selectionColor={colors.accent}
      />
    </View>
  );
}

export function MedicalScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { medical, userName } = useSafety();
  const [form, setForm] = useState<MedicalInfo>(medical ?? emptyMedicalInfo);
  const [editing, setEditing] = useState(!medical);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  useEffect(() => {
    if (medical && !editing) setForm(medical);
  }, [medical, editing]);

  const update = (key: keyof MedicalInfo) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!user) return;
    if (!form.bloodType) {
      setMessage({ type: 'error', text: 'Selecciona tu tipo de sangre (o "No sé").' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await saveMedicalInfo(user.uid, form);
      setEditing(false);
      setMessage({ type: 'success', text: 'Ficha guardada. Solo tú puedes verla.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar la ficha. Revisa tu conexión.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader
            title="Ficha de emergencia"
            subtitle="Para mostrársela a rescatistas"
            onBack={() => navigation.goBack()}
          />

          <View style={styles.privacy}>
            <Ionicons name="lock-closed" size={16} color={colors.accent} />
            <Text style={styles.privacyText}>
              Se guarda en tu cuenta y solo tú puedes verla. En modo SOS puedes mostrarla en pantalla.
            </Text>
          </View>

          <FormMessage message={message} />

          {!editing && medical ? (
            <>
              <MedicalCardView name={userName} info={medical} />
              <Pressable onPress={() => setEditing(true)} style={styles.edit}>
                <Ionicons name="create-outline" size={18} color={colors.accent} />
                <Text style={styles.editText}>Editar ficha</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Tipo de sangre</Text>
              <View style={styles.bloodGrid}>
                {BLOOD_TYPES.map((type) => {
                  const selected = form.bloodType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => update('bloodType')(type)}
                      style={[styles.blood, selected && styles.bloodSelected]}
                    >
                      <Text style={[styles.bloodText, selected && styles.bloodTextSelected]}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Field label="Alergias" value={form.allergies} onChangeText={update('allergies')} placeholder="Ej. penicilina, maní" multiline />
              <Field label="Condiciones médicas" value={form.conditions} onChangeText={update('conditions')} placeholder="Ej. asma, diabetes, embarazo" multiline />
              <Field label="Medicamentos que tomas" value={form.medications} onChangeText={update('medications')} placeholder="Ej. inhalador, insulina" multiline />
              <Field label="EPS o seguro médico" value={form.healthInsurer} onChangeText={update('healthInsurer')} placeholder="Nombre de tu EPS" />
              <Field label="Notas para rescatistas" value={form.notes} onChangeText={update('notes')} placeholder="Ej. uso marcapasos, no escucho bien" multiline />
              <PrimaryButton title="Guardar ficha" icon="checkmark" onPress={save} loading={busy} />
              {medical ? (
                <Pressable
                  onPress={() => {
                    setForm(medical);
                    setEditing(false);
                  }}
                  style={styles.cancel}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
              ) : null}
            </View>
          )}
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
  privacy: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  privacyText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
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
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  blood: {
    minWidth: 56,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  bloodSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  bloodText: {
    color: colors.muted,
    fontWeight: '800',
  },
  bloodTextSelected: {
    color: colors.danger,
  },
  field: {
    marginBottom: spacing.md,
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
    minHeight: 64,
    textAlignVertical: 'top',
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  editText: {
    color: colors.accent,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '700',
  },
});
