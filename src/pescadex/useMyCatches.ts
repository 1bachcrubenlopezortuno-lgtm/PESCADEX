import { useCallback, useEffect, useState } from 'react';
import { listCatches } from '../data/api';
import type { Catch } from '../data/types';

export function useCatches(filter: { userId?: string }) {
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = filter.userId ?? '';

  const reload = useCallback(() => {
    setLoading(true);
    listCatches(key ? { userId: key } : {})
      .then((c) => {
        setCatches(c);
        setError(null);
      })
      .catch(() => setError('No se pudieron cargar las capturas.'))
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(reload, [reload]);
  return { catches, loading, error, reload };
}

export function useMyCatches(userId: string) {
  return useCatches({ userId });
}
