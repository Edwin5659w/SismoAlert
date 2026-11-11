import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export type KitItem = { id: string; label: string; hint?: string };
export type KitGroup = { title: string; icon: IconName; items: KitItem[] };

/** Mochila de emergencia para 72 horas (recomendaciones de la UNGRD). */
export const KIT_GROUPS: KitGroup[] = [
  {
    title: 'Agua y alimentos',
    icon: 'water',
    items: [
      { id: 'agua', label: 'Agua potable', hint: '4 litros por persona al día, para 3 días' },
      { id: 'comida', label: 'Alimentos no perecederos', hint: 'Enlatados, barras, frutos secos' },
      { id: 'abrelatas', label: 'Abrelatas y cubiertos' },
    ],
  },
  {
    title: 'Salud',
    icon: 'medkit',
    items: [
      { id: 'botiquin', label: 'Botiquín de primeros auxilios' },
      { id: 'medicamentos', label: 'Medicamentos personales', hint: 'Para al menos una semana' },
      { id: 'higiene', label: 'Kit de aseo', hint: 'Jabón, papel higiénico, tapabocas' },
    ],
  },
  {
    title: 'Herramientas',
    icon: 'flashlight',
    items: [
      { id: 'linterna', label: 'Linterna y pilas de repuesto' },
      { id: 'radio', label: 'Radio portátil' },
      { id: 'pito', label: 'Pito para pedir auxilio' },
      { id: 'cargador', label: 'Batería externa cargada' },
      { id: 'manta', label: 'Manta térmica o cobija' },
    ],
  },
  {
    title: 'Documentos y dinero',
    icon: 'document-text',
    items: [
      { id: 'documentos', label: 'Copia de documentos', hint: 'Cédula, EPS, escrituras, en bolsa plástica' },
      { id: 'efectivo', label: 'Dinero en efectivo', hint: 'Billetes de baja denominación' },
      { id: 'contactos', label: 'Lista de contactos en papel' },
    ],
  },
];

export const KIT_TOTAL = KIT_GROUPS.reduce((total, group) => total + group.items.length, 0);

export const SAFETY_TIPS = [
  'Ubica en cada habitación un lugar seguro: bajo una mesa firme o junto a un mueble bajo.',
  'Durante el sismo: agáchate, cúbrete y sujétate. No corras hacia las escaleras.',
  'Ten siempre a mano zapatos y una linterna cerca de tu cama.',
  'Asegura a la pared repisas, bibliotecas y objetos pesados que puedan caer.',
  'Acuerda con tu familia un punto de encuentro fuera de casa.',
  'Después de un sismo, usa mensajes de texto: las líneas telefónicas se congestionan.',
  'Revisa cada 6 meses la fecha de vencimiento del agua y los alimentos de tu kit.',
  'Aprende a cerrar las llaves del gas, el agua y el tablero eléctrico de tu casa.',
];

export function tipOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const day = Math.floor((date.getTime() - start) / 86400000);
  return SAFETY_TIPS[day % SAFETY_TIPS.length];
}
