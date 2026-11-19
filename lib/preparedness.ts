import { KIT_TOTAL } from '../data/preparedness';
import { MedicalInfo, Preparedness, RootTabParamList, TrustedContact } from '../types';

export type PreparednessCheck = {
  id: string;
  label: string;
  done: boolean;
  weight: number;
  route: keyof RootTabParamList;
};

const DRILL_VALID_MS = 180 * 24 * 60 * 60 * 1000;

/** Qué tan preparado está el usuario, de 0 a 100. */
export function preparednessScore(
  contacts: TrustedContact[],
  medical: MedicalInfo | null,
  preparedness: Preparedness,
) {
  const kitRatio = preparedness.kit.length / KIT_TOTAL;
  const checks: PreparednessCheck[] = [
    {
      id: 'contacts',
      label: contacts.length
        ? `${contacts.length} contacto${contacts.length === 1 ? '' : 's'} de confianza`
        : 'Agrega un contacto de confianza',
      done: contacts.length > 0,
      weight: 25,
      route: 'ContactosConfianza',
    },
    {
      id: 'medical',
      label: medical?.bloodType ? 'Ficha de emergencia lista' : 'Completa tu ficha de emergencia',
      done: Boolean(medical?.bloodType),
      weight: 20,
      route: 'FichaMedica',
    },
    {
      id: 'kit',
      label: `Kit de emergencia ${preparedness.kit.length}/${KIT_TOTAL}`,
      done: kitRatio >= 0.7,
      weight: 25,
      route: 'Preparacion',
    },
    {
      id: 'meeting',
      label: preparedness.meetingPoint ? 'Punto de encuentro definido' : 'Define un punto de encuentro',
      done: Boolean(preparedness.meetingPoint),
      weight: 15,
      route: 'Preparacion',
    },
    {
      id: 'drill',
      label:
        preparedness.lastDrillAt && Date.now() - preparedness.lastDrillAt < DRILL_VALID_MS
          ? 'Simulacro hecho en los últimos 6 meses'
          : 'Haz un simulacro',
      done: Boolean(preparedness.lastDrillAt && Date.now() - preparedness.lastDrillAt < DRILL_VALID_MS),
      weight: 15,
      route: 'Seguridad',
    },
  ];

  // El kit suma parcialmente aunque no llegue al 70 %.
  const percent = Math.round(
    checks.reduce((total, check) => {
      if (check.id === 'kit') return total + check.weight * Math.min(1, kitRatio / 0.7);
      return total + (check.done ? check.weight : 0);
    }, 0),
  );

  return { percent, checks };
}
