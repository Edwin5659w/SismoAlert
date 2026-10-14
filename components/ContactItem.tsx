import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type ContactItemProps = {
  name: string;
  description: string;
  phone: string;
};

export function ContactItem({ name, description, phone }: ContactItemProps) {
  return (
    <Pressable style={styles.card} onPress={() => Linking.openURL(`tel:${phone}`)}>
      <View style={styles.icon}>
        <Ionicons name="call" size={20} color={colors.accent} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Text style={styles.phone}>{phone}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  phone: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
});
