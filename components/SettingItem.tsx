import { ReactNode } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type SettingItemProps = {
  title: string;
  description?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  children?: ReactNode;
};

export function SettingItem({
  title,
  description,
  value,
  onValueChange,
  children,
}: SettingItemProps) {
  const showSwitch = typeof value === 'boolean' && onValueChange;

  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {showSwitch ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.text}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
});
