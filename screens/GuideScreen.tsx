import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuideSection } from '../components/GuideSection';
import { Header } from '../components/Header';
import { SectionTitle } from '../components/SectionTitle';
import { colors, radius, spacing } from '../theme';
import { RootTabParamList } from '../types';

export function GuideScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Guía de emergencia" subtitle="Qué hacer ante un sismo" />

        <SectionTitle title="Antes" caption="Prepárate con anticipación" />
        <GuideSection
          title="Prevención"
          icon="shield-checkmark"
          steps={[
            'Identifica las zonas seguras y las rutas de evacuación de tu hogar y trabajo.',
            'Prepara un kit con agua, alimentos no perecederos, linterna, radio, botiquín y documentos.',
            'Asegura muebles altos, repisas y objetos que puedan caer.',
            'Acuerda un punto de encuentro con tu familia y practica simulacros.',
          ]}
        />

        <SectionTitle title="Durante" caption="Mantén la calma" />
        <GuideSection
          title="Cuando tiembla"
          icon="alert-circle"
          steps={[
            'Agáchate, cúbrete bajo una mesa resistente y sujétate.',
            'Aléjate de ventanas, espejos y objetos que puedan caer.',
            'No uses ascensores ni corras hacia las escaleras.',
            'Si estás en la calle, aléjate de edificios, postes y cables.',
            'Si conduces, detente en un lugar abierto y permanece dentro del vehículo.',
          ]}
        />

        <SectionTitle title="Después" caption="Actúa con precaución" />
        <GuideSection
          title="Tras el movimiento"
          icon="medkit"
          steps={[
            'Revisa si hay heridos y presta primeros auxilios si sabes hacerlo.',
            'Evacúa con calma si hay daños; usa las escaleras.',
            'Cierra el gas y la electricidad si sospechas fugas o daños.',
            'Mantente atento a réplicas y a la información de las autoridades.',
            'Usa el teléfono solo para emergencias.',
          ]}
        />

        <Pressable style={styles.contacts} onPress={() => navigation.navigate('Contactos')}>
          <Text style={styles.contactsText}>Ver contactos de emergencia</Text>
        </Pressable>
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
  contacts: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    paddingVertical: 14,
  },
  contactsText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
