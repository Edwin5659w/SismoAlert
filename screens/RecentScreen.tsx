import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { OptionPills } from '../components/OptionPills';
import { QuakeListItem } from '../components/QuakeListItem';
import { SectionTitle } from '../components/SectionTitle';
import { runEarthquakeSync, useEarthquakeSyncStatus } from '../hooks/useEarthquakeSync';
import { useEarthquakes } from '../hooks/useEarthquakes';
import { parseMagnitude } from '../lib/magnitude';
import { colors, spacing } from '../theme';
import { RootTabParamList } from '../types';

const FILTER_OPTIONS = ['Todos', '3.0+', '4.0+', '5.0+'];

export function RecentScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { earthquakes, loading, error } = useEarthquakes();
  const syncStatus = useEarthquakeSyncStatus();
  const [filter, setFilter] = useState('Todos');

  const visibleEarthquakes = useMemo(
    () =>
      earthquakes.filter((item) => filter === 'Todos' || item.magnitude >= parseMagnitude(filter)),
    [earthquakes, filter],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visibleEarthquakes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={syncStatus.state === 'syncing'}
            onRefresh={() => runEarthquakeSync(true)}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View>
            <Header title="Sismos recientes" subtitle="Registros reales sincronizados en Firestore" />
            <SectionTitle title="Filtrar por magnitud" caption="Desliza hacia abajo para actualizar" />
            <OptionPills options={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />
            {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <SectionTitle title={`${visibleEarthquakes.length} sismos`} />
          </View>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No hay sismos para el filtro seleccionado.</Text> : null
        }
        renderItem={({ item }) => (
          <QuakeListItem
            earthquake={item}
            onPress={(earthquake) => navigation.navigate('Detalle', { id: earthquake.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loader: {
    marginTop: spacing.lg,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
  },
  empty: {
    color: colors.muted,
    marginBottom: spacing.sm,
  },
});
