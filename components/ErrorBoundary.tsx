import { Ionicons } from '@expo/vector-icons';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type State = { hasError: boolean };

/**
 * Si una pantalla falla, en vez de cerrarse la app muestra esta pantalla.
 * En una app de emergencias, el 123 siempre debe quedar a un toque.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la interfaz', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <Ionicons name="alert-circle" size={48} color={colors.warning} />
        <Text style={styles.title}>Algo salió mal</Text>
        <Text style={styles.text}>Tuvimos un problema al mostrar esta pantalla. Puedes intentarlo de nuevo.</Text>
        <Pressable style={styles.retry} onPress={() => this.setState({ hasError: false })}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
        <Pressable style={styles.call} onPress={() => Linking.openURL('tel:123')}>
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.callText}>Llamar al 123</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  text: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  retry: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  retryText: { color: colors.onAccent, fontWeight: '800' },
  call: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callText: { color: '#fff', fontWeight: '800' },
});
