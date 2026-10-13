import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { SeismicWave } from './SeismicWave';

type AuthBrandProps = {
  compact?: boolean;
};

/** Logo, nombre y onda sísmica en la parte superior de las pantallas de acceso. */
export function AuthBrand({ compact = false }: AuthBrandProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.logoOuter, compact && styles.logoOuterCompact]}>
        <View style={[styles.logoInner, compact && styles.logoInnerCompact]}>
          <Ionicons name="pulse" size={compact ? 22 : 30} color={colors.accent} />
        </View>
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
        Sismo<Text style={styles.titleAccent}>Alert</Text>
      </Text>
      {compact ? null : <Text style={styles.tagline}>Alertas sísmicas para Colombia</Text>}
      <View style={styles.wave}>
        <SeismicWave height={compact ? 30 : 46} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  containerCompact: {
    marginBottom: spacing.md,
  },
  logoOuter: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    backgroundColor: 'rgba(45, 212, 191, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  logoOuterCompact: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInnerCompact: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 24,
  },
  titleAccent: {
    color: colors.accent,
  },
  tagline: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  wave: {
    marginTop: spacing.md,
  },
});
