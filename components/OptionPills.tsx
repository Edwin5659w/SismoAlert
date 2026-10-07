import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type OptionPillsProps = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function OptionPills({ options, selected, onSelect }: OptionPillsProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.pill, isSelected && styles.pillSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.accent,
  },
});
