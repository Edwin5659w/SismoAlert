import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export function LoginScreen() {
  const { configured, signIn, signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const normalizedEmail = email.trim();
    const isRegister = mode === 'register';

    if (!normalizedEmail || !password || (isRegister && (!displayName.trim() || !confirmPassword))) {
      setError('Completa todos los campos.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (isRegister) {
      if (
        password.length < 8 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/\d/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
      ) {
        setError('Usa 8 caracteres como mínimo, con mayúscula, minúscula, número y símbolo.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(normalizedEmail, password);
      } else {
        await signUp(displayName.trim(), normalizedEmail, password);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header
            title="SismoAlert"
            subtitle={mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          />

          {!configured ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Falta vincular Firebase</Text>
              <Text style={styles.bannerText}>
                Obtén las claves en Firebase Console, en Configuración del proyecto → General → Tus
                aplicaciones, y agrégalas al archivo .env.
              </Text>
            </View>
          ) : null}

          {mode === 'register' ? (
            <>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Tu nombre"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                editable={configured && !busy}
              />
            </>
          ) : null}

          <Text style={styles.label}>Correo</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="tu@correo.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            editable={configured && !busy}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            secureTextEntry
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder={mode === 'register' ? 'Mínimo 8 caracteres, con letras, número y símbolo' : 'Tu contraseña'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            editable={configured && !busy}
          />

          {mode === 'register' ? (
            <>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <TextInput
                secureTextEntry
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={configured && !busy}
              />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (!configured || busy) && styles.buttonDisabled]}
            onPress={submit}
            disabled={!configured || busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            disabled={busy}
          >
            <Text style={styles.switch}>
              {mode === 'login'
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </Pressable>
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
    flexGrow: 1,
  },
  banner: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerTitle: {
    color: colors.danger,
    fontWeight: '700',
    marginBottom: 6,
  },
  bannerText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  switch: {
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
  },
});
