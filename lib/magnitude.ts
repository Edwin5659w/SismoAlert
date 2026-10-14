import { colors } from '../theme';
import { Severity } from '../types';

export const severityColors: Record<Severity, string> = {
  Leve: colors.success,
  Moderado: colors.warning,
  Fuerte: '#FB923C',
  'Muy fuerte': colors.danger,
};

export function magnitudeColor(magnitude: number) {
  if (magnitude >= 6) return colors.danger;
  if (magnitude >= 5) return '#FB923C';
  if (magnitude >= 4) return colors.warning;
  return colors.success;
}

export function parseMagnitude(option: string) {
  return Number.parseFloat(option.replace('+', '')) || 0;
}
