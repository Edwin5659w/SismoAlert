import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { adUnits } from '../../config/monetization';
import { useAds } from '../../context/AdsContext';
import { loadAdsModule } from '../../lib/ads';
import { colors, radius, spacing } from '../../theme';
import { RootTabParamList } from '../../types';

/**
 * Espacio para un banner. No ocupa lugar si el usuario es Premium, si no dio
 * consentimiento, si no hay inventario o si la app corre en Expo Go.
 * Regla: NO usar en pantallas de emergencia (SOS, alerta, guía, contactos).
 */
export function BannerSlot() {
  const { enabled } = useAds();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [failed, setFailed] = useState(false);
  const ads = loadAdsModule();

  if (!enabled || !ads || failed) return null;
  const { BannerAd, BannerAdSize } = ads;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Publicidad</Text>
        <Pressable onPress={() => navigation.navigate('Premium')} hitSlop={8}>
          <Text style={styles.remove}>Quitar anuncios</Text>
        </Pressable>
      </View>
      <BannerAd
        unitId={adUnits.banner}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.mutedDim,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remove: {
    color: colors.accent,
    fontSize: 11.5,
    fontWeight: '700',
  },
});
