import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '../components/auth/AuthTextField';
import { FormMessage, FormMessageValue } from '../components/auth/FormMessage';
import { BackHeader } from '../components/BackHeader';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

type Props = BottomTabScreenProps<RootTabParamList, 'EliminarCuenta'>;

const WHAT_IS_DELETED = [
  'Tu cuenta y tu perfil',
  'Tus contactos de confianza',
  'Tu ficha de emergencia',
  'Tu kit, plan familiar e historial de "¿Estás bien?"',
  'Tu ubicación aproximada y preferencias',
];

export function DeleteAccountScreen({ navigation }: Props) {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  const submit = async () => {
    if (!password) {
      setMessage({ type: 'error', text: 'Escribe tu contraseña para confirmar.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Al terminar, Firebase cierra la sesión y la app vuelve al inicio de sesión.
      await deleteAccount(password);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.',
      });
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader title="Eliminar cuenta" subtitle={user?.email ?? undefined} onBack={() => navigation.goBack()} />

          <View style={styles.warning}>
            <Ionicons name="warning" size={22} color={colors.danger} />
            <Text style={styles.warningText}>
              Esta acción es permanente. Se borrarán de inmediato todos tus datos y no podrás recuperarlos.
            </Text>
          </View>

          <View style={styles.list}>
            {WHAT_IS_DELETED.map((item) => (
              <View key={item} style={styles.row}>
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            Si tienes una suscripción activa, cancélala también en Google Play: eliminar la cuenta no la
            cancela automáticamente.
          </Text>

          <FormMessage message={message} />

          <Pressable
            onPress={() => setConfirmed((value) => !value)}
            style={styles.confirm}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            disabled={busy}
          >
            <View style={[styles.checkbox, confirmed && styles.checkboxOn]}>
              {confirmed ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
            </View>
            <Text style={styles.confirmText}>Entiendo que se borrarán todos mis datos.</Text>
          </Pressable>

          {confirmed ? (
            <AuthTextField
              label="Contraseña"
              icon="lock-closed-outline"
              placeholder="Tu contraseña actual"
              password
              autoCapitalize="none"
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!confirmed || busy}
            style={[styles.delete, (!confirmed || busy) && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.deleteText}>{busy ? 'Eliminando…' : 'Eliminar mi cuenta'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 1.5 },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 10,
    marginTop: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { color: colors.text, fontSize: 14, flex: 1 },
  note: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginVertical: spacing.md },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  confirmText: { color: colors.text, flex: 1 },
  delete: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 16,
  },
  disabled: { opacity: 0.4 },
  deleteText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
