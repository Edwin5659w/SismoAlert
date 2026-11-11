import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormMessage, FormMessageValue } from '../components/auth/FormMessage';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { BackHeader } from '../components/BackHeader';
import { premiumBenefits } from '../config/monetization';
import { useEntitlement } from '../context/EntitlementContext';
import { formatLocalTime } from '../lib/time';
import type { PurchasesPackage } from '../services/purchases';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

type Props = BottomTabScreenProps<RootTabParamList, 'Premium'>;

const GOLD = '#FBBF24';
const MANAGE_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

function planLabel(aPackage: PurchasesPackage) {
  switch (String(aPackage.packageType)) {
    case 'ANNUAL':
      return { title: 'Anual', period: '/año' };
    case 'MONTHLY':
      return { title: 'Mensual', period: '/mes' };
    case 'SIX_MONTH':
      return { title: '6 meses', period: '/6 meses' };
    case 'THREE_MONTH':
      return { title: '3 meses', period: '/3 meses' };
    case 'WEEKLY':
      return { title: 'Semanal', period: '/semana' };
    case 'LIFETIME':
      return { title: 'De por vida', period: ' una vez' };
    default:
      return { title: aPackage.product.title, period: '' };
  }
}

export function PaywallScreen({ navigation }: Props) {
  const { tier, isPremium, entitlement, offering, offeringError, loadOffering, buy, restore, activating } =
    useEntitlement();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  useEffect(() => {
    if (isPremium || offering) return;
    setLoadingPlans(true);
    loadOffering().finally(() => setLoadingPlans(false));
  }, [isPremium, loadOffering, offering]);

  const packages = useMemo(() => offering?.availablePackages ?? [], [offering]);
  const annual = offering?.annual ?? null;
  const monthly = offering?.monthly ?? null;

  // Ahorro del plan anual frente a pagar 12 meses.
  const savings =
    annual && monthly && monthly.product.price > 0
      ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100)
      : 0;

  useEffect(() => {
    if (!selectedId && packages.length) {
      setSelectedId((annual ?? packages[0]).identifier);
    }
  }, [annual, packages, selectedId]);

  const selected = packages.find((item) => item.identifier === selectedId) ?? null;

  const onBuy = async () => {
    if (!selected) return;
    setBusy('buy');
    setMessage(null);
    const result = await buy(selected);
    setBusy(null);
    if (result.ok) {
      setMessage({ type: 'success', title: '¡Gracias!', text: 'Estamos activando tu suscripción…' });
    } else if (!result.cancelled) {
      setMessage({ type: 'error', text: result.message ?? 'No se pudo completar la compra.' });
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    setMessage(null);
    const result = await restore();
    setBusy(null);
    setMessage(
      result.ok
        ? { type: 'success', text: 'Compras restauradas.' }
        : { type: 'error', text: result.message ?? 'No se pudieron restaurar las compras.' },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackHeader title="SismoAlert Premium" onBack={() => navigation.goBack()} />

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={34} color={GOLD} />
          </View>
          <Text style={styles.heroTitle}>
            {isPremium ? 'Eres Premium' : 'Protección que no depende de tu celular'}
          </Text>
          <Text style={styles.heroText}>
            {isPremium
              ? 'Gracias por apoyar SismoAlert. Tu escalada automática está disponible.'
              : 'Si no respondes después de un sismo fuerte, llamamos a tus contactos por ti.'}
          </Text>
        </View>

        <FormMessage message={message} />

        {activating ? (
          <View style={styles.activating}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.activatingText}>Confirmando tu compra con el servidor…</Text>
          </View>
        ) : null}

        <View style={styles.benefits}>
          {premiumBenefits.map((benefit) => (
            <View key={benefit.title} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={18} color={GOLD} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Tu suscripción</Text>
            <Text style={styles.statusText}>
              {entitlement.expiresAt
                ? `${entitlement.willRenew === false ? 'Vence' : 'Se renueva'} el ${formatLocalTime(entitlement.expiresAt)}`
                : 'Activa'}
            </Text>
            <Pressable onPress={() => Linking.openURL(MANAGE_URL)} style={styles.manage}>
              <Text style={styles.manageText}>Administrar en la tienda</Text>
              <Ionicons name="open-outline" size={14} color={colors.accent} />
            </Pressable>
          </View>
        ) : (
          <>
            {loadingPlans || tier === 'loading' ? (
              <ActivityIndicator color={GOLD} style={styles.loader} />
            ) : offeringError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{offeringError}</Text>
                <Pressable
                  onPress={() => {
                    setLoadingPlans(true);
                    loadOffering().finally(() => setLoadingPlans(false));
                  }}
                >
                  <Text style={styles.retry}>Reintentar</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.plans}>
                {packages.map((item) => {
                  const label = planLabel(item);
                  const isSelected = item.identifier === selectedId;
                  const isAnnual = item.identifier === annual?.identifier;
                  return (
                    <Pressable
                      key={item.identifier}
                      onPress={() => setSelectedId(item.identifier)}
                      style={[styles.plan, isSelected && styles.planSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={[styles.radio, isSelected && styles.radioOn]}>
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.planTitle}>{label.title}</Text>
                        {isAnnual && item.product.pricePerMonthString ? (
                          <Text style={styles.planCaption}>Equivale a {item.product.pricePerMonthString}/mes</Text>
                        ) : null}
                      </View>
                      <Text style={styles.planPrice}>
                        {item.product.priceString}
                        <Text style={styles.planPeriod}>{label.period}</Text>
                      </Text>
                      {isAnnual && savings > 0 ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Ahorra {savings}%</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <PrimaryButton
              title={selected ? `Suscribirme · ${selected.product.priceString}` : 'Suscribirme'}
              icon="sparkles"
              onPress={onBuy}
              loading={busy === 'buy'}
              disabled={!selected || busy !== null}
            />
            <Pressable onPress={onRestore} disabled={busy !== null} style={styles.restore}>
              {busy === 'restore' ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <Text style={styles.restoreText}>Restaurar compras</Text>
              )}
            </Pressable>
            <Text style={styles.legal}>
              La suscripción se renueva automáticamente hasta que la canceles en la tienda, al menos 24 horas
              antes del fin del período. Las funciones básicas de seguridad (SOS, "¿Estás bien?", contactos,
              guía) son gratuitas.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 1.5 },
  flex: { flex: 1 },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: spacing.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -150,
    backgroundColor: GOLD,
    opacity: 0.08,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  heroText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  activating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  activatingText: { color: colors.text, fontSize: 13 },
  benefits: { gap: spacing.md, marginBottom: spacing.lg },
  benefit: { flexDirection: 'row', gap: spacing.md },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  benefitText: { color: colors.muted, fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  loader: { marginVertical: spacing.lg },
  errorBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.muted, textAlign: 'center' },
  retry: { color: colors.accent, fontWeight: '700' },
  plans: { gap: spacing.sm, marginBottom: spacing.lg },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  planSelected: { borderColor: GOLD, backgroundColor: 'rgba(251, 191, 36, 0.06)' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.mutedDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: GOLD },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  planTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  planCaption: { color: colors.muted, fontSize: 12, marginTop: 2 },
  planPrice: { color: colors.text, fontSize: 16, fontWeight: '800' },
  planPeriod: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: GOLD,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#3B2A00', fontSize: 11, fontWeight: '900' },
  restore: { alignItems: 'center', paddingVertical: spacing.md },
  restoreText: { color: colors.muted, fontWeight: '700' },
  legal: { color: colors.mutedDim, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statusTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  statusText: { color: colors.muted, marginTop: 4 },
  manage: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  manageText: { color: colors.accent, fontWeight: '700' },
});
