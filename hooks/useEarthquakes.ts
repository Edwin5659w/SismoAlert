import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeEarthquakes } from '../services/earthquakes';
import { Earthquake } from '../types';

export function useEarthquakes() {
  const { user } = useAuth();
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    try {
      return subscribeEarthquakes(
        (items) => {
          setEarthquakes(items);
          setLoading(false);
        },
        (nextError) => {
          setError(nextError.message);
          setLoading(false);
        },
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'No se pudieron cargar los sismos de Firebase.',
      );
      setLoading(false);
    }
  }, [user]);

  return { earthquakes, loading, error };
}
