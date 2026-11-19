import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { MedicalInfo } from '../../types';

type MedicalCardViewProps = {
  name: string;
  info: MedicalInfo;
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** Ficha para mostrar a rescatistas: letras grandes y alto contraste. */
export function MedicalCardView({ name, info }: MedicalCardViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="medical" size={18} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>FICHA DE EMERGENCIA</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        {info.bloodType ? (
          <View style={styles.blood}>
            <Text style={styles.bloodLabel}>Sangre</Text>
            <Text style={styles.bloodValue}>{info.bloodType}</Text>
          </View>
        ) : null}
      </View>
      <Row label="Alergias" value={info.allergies || 'Ninguna conocida'} />
      <Row label="Condiciones médicas" value={info.conditions} />
      <Row label="Medicamentos" value={info.medications} />
      <Row label="EPS / seguro" value={info.healthInsurer} />
      <Row label="Notas" value={info.notes} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF7F8',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  name: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  blood: {
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bloodLabel: {
    color: '#9F1239',
    fontSize: 10,
    fontWeight: '700',
  },
  bloodValue: {
    color: '#BE123C',
    fontSize: 22,
    fontWeight: '900',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#FBD5DA',
    paddingTop: 8,
  },
  rowLabel: {
    color: '#9F1239',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowValue: {
    color: '#111827',
    fontSize: 15,
    marginTop: 2,
  },
});
