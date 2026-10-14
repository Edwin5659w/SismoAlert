import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ContactItem } from '../components/ContactItem';
import { Header } from '../components/Header';
import { SectionTitle } from '../components/SectionTitle';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

type ContactsScreenProps = BottomTabScreenProps<RootTabParamList, 'Contactos'>;

export function ContactsScreen({ navigation }: ContactsScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Contactos de emergencia" subtitle="Toca un número para llamar" />

        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={colors.accent} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <SectionTitle title="Líneas nacionales" caption="Colombia" />
        <ContactItem name="Línea única de emergencias" description="Policía, ambulancia y bomberos" phone="123" />
        <ContactItem name="Defensa Civil" description="Atención de desastres" phone="144" />
        <ContactItem name="Bomberos" description="Incendios y rescate" phone="119" />
        <ContactItem name="Cruz Roja Colombiana" description="Primeros auxilios y ayuda humanitaria" phone="132" />
        <ContactItem name="Policía Nacional" description="Seguridad ciudadana" phone="112" />
      </ScrollView>
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
