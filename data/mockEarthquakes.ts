import { Earthquake } from '../types';

const now = Date.now();

export const seedEarthquakes: Omit<Earthquake, 'id' | 'timeAgo'>[] = [
  {
    magnitude: 4.6,
    location: 'Los Santos, Santander',
    depthKm: 148,
    occurredAt: now - 12 * 60 * 1000,
    severity: 'Moderado',
  },
  {
    magnitude: 3.2,
    location: 'Popayán, Cauca',
    depthKm: 32,
    occurredAt: now - 47 * 60 * 1000,
    severity: 'Leve',
  },
  {
    magnitude: 5.4,
    location: 'Costa de Nariño',
    depthKm: 41,
    occurredAt: now - 2 * 60 * 60 * 1000,
    severity: 'Fuerte',
  },
  {
    magnitude: 3.8,
    location: 'Mesetas, Meta',
    depthKm: 18,
    occurredAt: now - 5 * 60 * 60 * 1000,
    severity: 'Leve',
  },
];
