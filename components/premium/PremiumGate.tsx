import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEntitlement } from '../../context/EntitlementContext';
import { colors, radius, spacing } from '../../theme';
import { RootTabParamList } from '../../types';

type PremiumGateProps = {
  feature: string;
  description: string;
  children: ReactNode;
};

/**
 * Muestra `children` solo a usuarios Premium confirmados por el servidor.
 * Esto es solo interfaz: la función real (p. ej. la llamada automática) la vuelve
 * a validar el servidor antes de ejecutarse.
 */
export function PremiumGate({ feature, description, children }: PremiumGateProps) {
  const { tier } = useEntitlement();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  if (tier === 'loading') {
    return <ActivityIndicator color={colors.warning} style={{ marginVertical: spacing.md }} />;
  }
  if (tier === 'premium') return <>{children}</>;

  return (
    <Pressable
      onPress={() => navigation.navigate('Premium')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${feature}. Disponible con Premium`}
    >
      <View style={styles.icon}>
        <Ionicons name="lock-closed" size={18} color={colors.warning} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{feature}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PREMIUM</Text>
          </View>
        </View>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.cta}>Ver planes</Text>
      </View>
    </Pressable>
  );
}

export function PremiumBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { backgroundColor: 'rgba(251, 191, 36, 0.12)' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  cta: { color: colors.warning, fontWeight: '800', fontSize: 13, marginTop: spacing.sm },
  badge: {
    backgroundColor: colors.warning,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: { color: '#3B2A00', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});
