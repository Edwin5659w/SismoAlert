import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthBrand } from '../components/auth/AuthBrand';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthTextField } from '../components/auth/AuthTextField';
import { FormMessage, FormMessageValue } from '../components/auth/FormMessage';
import { PasswordStrength, evaluatePassword } from '../components/auth/PasswordStrength';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validateName } from '../lib/validation';
import { colors, radius, spacing } from '../theme';

type RegisterScreenProps = {
  onGoToLogin: () => void;
};

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
};

export function RegisterScreen({ onGoToLogin }: RegisterScreenProps) {
  const { configured, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const disabled = !configured || busy;
  const passwordsMatch = confirm.length > 0 && confirm === password;

  const clearError = (key: keyof Errors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async () => {
    Keyboard.dismiss();
    setMessage(null);

    const nextErrors: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: !password
        ? 'Crea una contraseña.'
        : evaluatePassword(password).strong
          ? undefined
          : 'Tu contraseña debe cumplir todos los requisitos.',
      confirm: !confirm
        ? 'Confirma tu contraseña.'
        : confirm !== password
          ? 'Las contraseñas no coinciden.'
          : undefined,
      terms: acceptedTerms ? undefined : 'Debes aceptar los términos para continuar.',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setBusy(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo crear la cuenta.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      top={
        <View>
          <Pressable
            onPress={onGoToLogin}
            style={styles.back}
            hitSlop={10}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Volver a iniciar sesión"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <AuthBrand compact />
        </View>
      }
    >
      <Text style={styles.title} accessibilityRole="header">
        Crea tu cuenta
      </Text>
      <Text style={styles.subtitle}>
        Recibe alertas sísmicas y guarda tus preferencias en todos tus dispositivos.
      </Text>

      <FormMessage message={message} />

      <AuthTextField
        label="Nombre completo"
        icon="person-outline"
        placeholder="Ej. Laura Gómez"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        maxLength={60}
        value={name}
        onChangeText={(value) => {
          setName(value);
          clearError('name');
        }}
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
        error={errors.name}
        editable={!disabled}
      />

      <AuthTextField
        ref={emailRef}
        label="Correo electrónico"
        icon="mail-outline"
        placeholder="tu@correo.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearError('email');
        }}
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
        error={errors.email}
        editable={!disabled}
      />

      <AuthTextField
        ref={passwordRef}
        label="Contraseña"
        icon="lock-closed-outline"
        placeholder="Crea una contraseña segura"
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError('password');
        }}
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
        error={errors.password}
        editable={!disabled}
      />
      <PasswordStrength password={password} />

      <AuthTextField
        ref={confirmRef}
        label="Confirmar contraseña"
        icon="shield-checkmark-outline"
        placeholder="Repite tu contraseña"
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          clearError('confirm');
        }}
        onSubmitEditing={submit}
        error={errors.confirm}
        editable={!disabled}
        trailing={
          passwordsMatch ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null
        }
      />

      <Pressable
        onPress={() => {
          setAcceptedTerms((value) => !value);
          clearError('terms');
        }}
        disabled={disabled}
        style={styles.terms}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
      >
        <View
          style={[
            styles.checkbox,
            acceptedTerms && styles.checkboxOn,
            errors.terms ? styles.checkboxError : null,
          ]}
        >
          {acceptedTerms ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
        </View>
        <Text style={styles.termsText}>
          Acepto los <Text style={styles.termsLink}>términos de uso</Text> y la{' '}
          <Text style={styles.termsLink}>política de privacidad</Text> de SismoAlert.
        </Text>
      </Pressable>
      {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

      <PrimaryButton
        title="Crear cuenta"
        icon="arrow-forward"
        onPress={submit}
        loading={busy}
        disabled={!configured}
      />

      <Pressable onPress={onGoToLogin} disabled={busy} style={styles.switch} accessibilityRole="link">
        <Text style={styles.switchText}>
          ¿Ya tienes cuenta? <Text style={styles.switchLink}>Inicia sesión</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: 0,
    top: 4,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  terms: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxError: {
    borderColor: colors.danger,
  },
  termsText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: '600',
  },
  termsError: {
    color: colors.danger,
    fontSize: 12.5,
    marginLeft: 32,
  },
  switch: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    color: colors.muted,
    fontSize: 14,
  },
  switchLink: {
    color: colors.accent,
    fontWeight: '700',
  },
});
