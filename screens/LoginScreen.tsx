import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthBrand } from '../components/auth/AuthBrand';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthTextField } from '../components/auth/AuthTextField';
import { FormMessage, FormMessageValue } from '../components/auth/FormMessage';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../lib/validation';
import { colors, spacing } from '../theme';

type LoginScreenProps = {
  onGoToRegister: () => void;
};

type Errors = { email?: string; password?: string };

export function LoginScreen({ onGoToRegister }: LoginScreenProps) {
  const { configured, signIn, resetPassword } = useAuth();
  const [view, setView] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<FormMessageValue | null>(
    configured
      ? null
      : {
          type: 'error',
          title: 'Falta vincular Firebase',
          text: 'Agrega las claves de Firebase Console (Configuración del proyecto → Tus aplicaciones) al archivo .env.',
        },
  );
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const disabled = !configured || busy;

  const switchView = (next: 'login' | 'reset') => {
    setView(next);
    setErrors({});
    setMessage(null);
  };

  const submitLogin = async () => {
    Keyboard.dismiss();
    setMessage(null);
    const nextErrors: Errors = {
      email: validateEmail(email),
      password: password ? undefined : 'Ingresa tu contraseña.',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      return;
    }

    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
      });
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    Keyboard.dismiss();
    setMessage(null);
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    if (emailError) {
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email.trim());
      setMessage({
        type: 'success',
        title: 'Revisa tu correo',
        text: 'Si existe una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo enviar el correo.',
      });
    } finally {
      setBusy(false);
    }
  };

  const isReset = view === 'reset';

  return (
    <AuthLayout top={<AuthBrand />}>
      {isReset ? (
        <Pressable
          onPress={() => switchView('login')}
          style={styles.back}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver a iniciar sesión"
        >
          <Ionicons name="arrow-back" size={18} color={colors.muted} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      ) : null}

      <Text style={styles.title} accessibilityRole="header">
        {isReset ? 'Recupera tu acceso' : 'Bienvenido de nuevo'}
      </Text>
      <Text style={styles.subtitle}>
        {isReset
          ? 'Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.'
          : 'Inicia sesión para ver la actividad sísmica y tus alertas.'}
      </Text>

      <FormMessage message={message} />

      <AuthTextField
        label="Correo electrónico"
        icon="mail-outline"
        placeholder="tu@correo.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType={isReset ? 'send' : 'next'}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
        }}
        onSubmitEditing={() => (isReset ? submitReset() : passwordRef.current?.focus())}
        submitBehavior={isReset ? 'blurAndSubmit' : 'submit'}
        error={errors.email}
        editable={!disabled}
      />

      {isReset ? null : (
        <>
          <AuthTextField
            ref={passwordRef}
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="Tu contraseña"
            password
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            onSubmitEditing={submitLogin}
            error={errors.password}
            editable={!disabled}
          />

          <Pressable
            onPress={() => switchView('reset')}
            style={styles.forgot}
            hitSlop={8}
            disabled={busy}
            accessibilityRole="link"
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </>
      )}

      <PrimaryButton
        title={isReset ? 'Enviar enlace' : 'Iniciar sesión'}
        icon={isReset ? 'paper-plane' : 'arrow-forward'}
        onPress={isReset ? submitReset : submitLogin}
        loading={busy}
        disabled={!configured}
      />

      {isReset ? null : (
        <>
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>¿Eres nuevo?</Text>
            <View style={styles.line} />
          </View>

          <Pressable
            onPress={onGoToRegister}
            disabled={busy}
            style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="person-add-outline" size={18} color={colors.accent} />
            <Text style={styles.secondaryText}>Crear una cuenta</Text>
          </Pressable>
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.muted,
    fontWeight: '600',
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
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.lg,
  },
  forgotText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedDim,
    fontSize: 12.5,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(45, 212, 191, 0.4)',
  },
  secondaryPressed: {
    backgroundColor: colors.accentSoft,
  },
  secondaryText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15.5,
  },
});
