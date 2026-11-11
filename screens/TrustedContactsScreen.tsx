import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '../components/auth/AuthTextField';
import { FormMessage, FormMessageValue } from '../components/auth/FormMessage';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { BackHeader } from '../components/BackHeader';
import { OptionPills } from '../components/OptionPills';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { callNumber, shareMessage } from '../lib/emergency';
import { maybeAskForReview } from '../lib/review';
import { validateEmail } from '../lib/validation';
import { MAX_CONTACTS, addTrustedContact, normalizePhone, removeTrustedContact } from '../services/safety';
import { colors, radius, spacing } from '../theme';
import { ContactRelation, RootTabParamList, TrustedContact } from '../types';

type Props = BottomTabScreenProps<RootTabParamList, 'ContactosConfianza'>;

const RELATIONS: ContactRelation[] = ['Familia', 'Pareja', 'Amigo/a', 'Trabajo', 'Vecino/a', 'Otro'];

type Errors = { name?: string; phone?: string; appEmail?: string };

function ContactCard({ contact, onRemove }: { contact: TrustedContact; onRemove: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.meta}>
          {contact.relation} · {contact.phone}
        </Text>
        {contact.appEmail ? (
          <View style={styles.linked}>
            <Ionicons name="notifications" size={11} color={colors.success} />
            <Text style={styles.linkedText}>Vinculado a SismoAlert</Text>
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => callNumber(contact.phone)} hitSlop={8} style={styles.iconButton} accessibilityLabel={`Llamar a ${contact.name}`}>
        <Ionicons name="call" size={18} color={colors.accent} />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.iconButton} accessibilityLabel={`Eliminar a ${contact.name}`}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );
}

export function TrustedContactsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { contacts } = useSafety();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<ContactRelation>('Familia');
  const [appEmail, setAppEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setRelation('Familia');
    setAppEmail('');
    setErrors({});
  };

  const save = async () => {
    if (!user) return;
    const digits = normalizePhone(phone).replace('+', '');
    const next: Errors = {
      name: name.trim().length < 2 ? 'Escribe el nombre del contacto.' : undefined,
      phone: digits.length < 7 || digits.length > 15 ? 'Escribe un número válido (ej. 3001234567).' : undefined,
      appEmail: appEmail.trim() ? validateEmail(appEmail) : undefined,
    };
    setErrors(next);
    if (next.name || next.phone || next.appEmail) return;

    setBusy(true);
    setMessage(null);
    try {
      await addTrustedContact(user.uid, {
        name: name.trim().slice(0, 60),
        phone,
        relation,
        appEmail: appEmail.trim() || undefined,
      });
      reset();
      setAdding(false);
      setMessage({ type: 'success', text: 'Contacto guardado.' });
      if (contacts.length === 0) maybeAskForReview();
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar el contacto. Revisa tu conexión.' });
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (contact: TrustedContact) => {
    if (!user) return;
    Alert.alert('Eliminar contacto', `¿Quitar a ${contact.name} de tus contactos de confianza?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => removeTrustedContact(user.uid, contact.id).catch(() => undefined),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader
            title="Contactos de confianza"
            subtitle={`${contacts.length} de ${MAX_CONTACTS}`}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.info}>
            <Ionicons name="information-circle" size={18} color={colors.accent} />
            <Text style={styles.infoText}>
              Si pides ayuda o no respondes después de un sismo, estas personas recibirán un mensaje con
              tu ubicación. Si también usan SismoAlert, escribe su correo y les llegará una notificación
              automática.
            </Text>
          </View>

          <FormMessage message={message} />

          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} onRemove={() => confirmRemove(contact)} />
          ))}

          {contacts.length === 0 && !adding ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={colors.mutedDim} />
              <Text style={styles.emptyText}>Aún no tienes contactos de confianza.</Text>
            </View>
          ) : null}

          {adding ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Nuevo contacto</Text>
              <AuthTextField
                label="Nombre"
                icon="person-outline"
                placeholder="Ej. Mamá"
                value={name}
                onChangeText={setName}
                error={errors.name}
                maxLength={60}
                editable={!busy}
              />
              <AuthTextField
                label="Celular"
                icon="call-outline"
                placeholder="3001234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                maxLength={20}
                editable={!busy}
              />
              <Text style={styles.label}>Relación</Text>
              <OptionPills options={RELATIONS} selected={relation} onSelect={(value) => setRelation(value as ContactRelation)} />
              <View style={{ height: spacing.md }} />
              <AuthTextField
                label="Correo en SismoAlert (opcional)"
                icon="mail-outline"
                placeholder="correo@ejemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={appEmail}
                onChangeText={setAppEmail}
                error={errors.appEmail}
                editable={!busy}
              />
              <PrimaryButton title="Guardar contacto" icon="checkmark" onPress={save} loading={busy} />
              <Pressable
                onPress={() => {
                  reset();
                  setAdding(false);
                }}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>
          ) : contacts.length < MAX_CONTACTS ? (
            <Pressable onPress={() => setAdding(true)} style={styles.add}>
              <Ionicons name="person-add" size={18} color={colors.accent} />
              <Text style={styles.addText}>Agregar contacto</Text>
            </Pressable>
          ) : null}

          {contacts.length ? (
            <Pressable
              onPress={() =>
                shareMessage(
                  'Te agregué como contacto de confianza en SismoAlert. Si hay un sismo fuerte y no respondo, te llegará un aviso con mi ubicación.',
                )
              }
              style={styles.share}
            >
              <Ionicons name="paper-plane-outline" size={16} color={colors.muted} />
              <Text style={styles.shareText}>Contarles que los agregaste</Text>
            </Pressable>
          ) : null}
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
  info: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: 2,
  },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  linkedText: {
    color: colors.success,
    fontSize: 11.5,
    fontWeight: '600',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.muted,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  formTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
    marginTop: -spacing.xs,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '700',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(45, 212, 191, 0.5)',
    borderRadius: radius.md,
    paddingVertical: 16,
    marginTop: spacing.sm,
  },
  addText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 15,
  },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  shareText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
