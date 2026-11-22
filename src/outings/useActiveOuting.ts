import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useGeolocation } from '../catches/useGeolocation';
import { createOuting, endOuting, listOutings } from '../data/api';
import type { Outing, OutingMode } from '../data/types';

export const ACTIVE_WINDOW_MS = 18 * 3600_000;

export function isActive(o: Outing, now = Date.now()): boolean {
  return o.endedAt === null && now - new Date(o.startedAt).getTime() < ACTIVE_WINDOW_MS;
}

export interface StartInput {
  mode: OutingMode;
  companionIds: string[];
  shareExact: boolean;
  note?: string;
}

export function useActiveOuting() {
  const { profile } = useAuth();
  const { request } = useGeolocation();
  const [active, setActive] = useState<Outing | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = profile!.id;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await listOutings({ userId });
      setActive(mine.find((o) => isActive(o)) ?? null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const start = useCallback(
    async (input: StartInput): Promise<Outing> => {
      const location = await request();
      const outing: Outing = {
        id: crypto.randomUUID(),
        ownerId: userId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        mode: input.mode,
        note: input.note ?? null,
        companionIds: input.companionIds,
        approx: null,
        exact: location,
        shareExact: input.shareExact,
      };
      await createOuting({ id: outing.id, startedAt: outing.startedAt, mode: input.mode, companionIds: input.companionIds, location, shareExact: input.shareExact, note: input.note });
      setActive(outing);
      return outing;
    },
    [request, userId],
  );

  const end = useCallback(async () => {
    if (!active) return;
    await endOuting(active.id, new Date().toISOString());
    setActive(null);
  }, [active]);

  return { active, loading, start, end, reload };
}
