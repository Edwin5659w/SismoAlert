import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type SectionTitleProps = {
  title: string;
  caption?: string;
};

export function SectionTitle({ title, caption }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
