import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { OptionPills } from '../components/OptionPills';
import { QuakeMap } from '../components/QuakeMap';
import { SectionTitle } from '../components/SectionTitle';
import { useSafety } from '../context/SafetyContext';
import { parseRadiusKm } from '../lib/geo';
import { parseMagnitude } from '../lib/magnitude';
import { colors, spacing } from '../theme';
import { RootTabParamList } from '../types';

const FILTER_OPTIONS = ['Todos', '3.0+', '4.0+', '5.0+'];

export function MapScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { earthquakes, earthquakesLoading: loading, earthquakesError: error, location, settings } = useSafety();
  const [filter, setFilter] = useState('Todos');

  const mapped = useMemo(
    () =>
      earthquakes.filter(
        (item) =>
          item.latitude !== undefined &&
          item.longitude !== undefined &&
          (filter === 'Todos' || item.magnitude >= parseMagnitude(filter)),
      ),
    [earthquakes, filter],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Header title="Mapa de epicentros" subtitle="Toca un marcador para ver el detalle" />
        <OptionPills options={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />
        <SectionTitle title={`${mapped.length} epicentros`} caption="Tamaño y color según magnitud" />
        {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <QuakeMap
          earthquakes={mapped}
          user={
            location.location
              ? {
                  latitude: location.location.latitude,
                  longitude: location.location.longitude,
                  radiusKm: parseRadiusKm(settings.alertRadius),
                }
              : undefined
          }
          onSelect={(id) => navigation.navigate('Detalle', { id })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  loader: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
