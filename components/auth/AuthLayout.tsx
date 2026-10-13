import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import { AuthBackground } from './AuthBackground';

type AuthLayoutProps = {
  children: ReactNode;
  top?: ReactNode;
};

/** Estructura común de las pantallas de acceso: fondo, teclado, scroll y pie. */
export function AuthLayout({ children, top }: AuthLayoutProps) {
  return (
    <View style={styles.root}>
      <AuthBackground />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {top}
            <View style={styles.card}>{children}</View>
            <View style={styles.footer}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.mutedDim} />
              <Text style={styles.footerText}>Tus datos se protegen con Firebase</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.mutedDim,
    fontSize: 12,
  },
});
