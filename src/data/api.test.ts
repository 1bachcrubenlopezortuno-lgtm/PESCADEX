import { vi } from 'vitest';

const calls: { table: string; op: string; args: unknown[] }[] = [];
let rpcResult: { data: unknown; error: { message: string } | null } = { data: null, error: null };

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const op of ['upsert', 'insert', 'select', 'eq', 'update', 'in', 'order']) {
    b[op] = (...args: unknown[]) => {
      calls.push({ table, op, args });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  return b;
}

vi.mock('./supabase', () => ({
  supabase: {
    from: (t: string) => builder(t),
    rpc: () => Promise.resolve(rpcResult),
  },
}));

import { createCatch, joinGroup, toGameCatch } from './api';
import type { Catch } from './types';

beforeEach(() => {
  calls.length = 0;
});

test('toGameCatch cuenta las fotos', () => {
  const c: Catch = {
    id: '1', outingId: 'o', userId: 'u', speciesId: 'dorada', caughtAt: '2026-01-01T00:00:00Z',
    weightG: 900, lengthCm: null, bait: null, note: null, shareExact: false, approx: null, exact: null,
    photoUrls: ['a', 'b'],
  };
  expect(toGameCatch(c)).toEqual({ id: '1', speciesId: 'dorada', caughtAt: '2026-01-01T00:00:00Z', photoCount: 2, weightG: 900, lengthCm: null });
});

test('joinGroup traduce invalid_invite', async () => {
  rpcResult = { data: null, error: { message: 'invalid_invite' } };
  await expect(joinGroup('x', 'Ana')).rejects.toThrow('invalid_invite');
});

test('createCatch es idempotente y guarda la ubicación aparte', async () => {
  await createCatch({ id: 'c1', outingId: 'o1', speciesId: 'dorada', caughtAt: 'now', shareExact: false, location: { lat: 36.5, lng: -6.2 } });
  const up = calls.find((c) => c.table === 'catches' && c.op === 'upsert')!;
  expect(up.args[1]).toMatchObject({ onConflict: 'id', ignoreDuplicates: true });
  expect(calls.some((c) => c.table === 'catch_locations' && c.op === 'upsert')).toBe(true);
});

test('createCatch sin ubicación no toca catch_locations', async () => {
  await createCatch({ id: 'c2', outingId: 'o1', speciesId: 'dorada', caughtAt: 'now', shareExact: false, location: null });
  expect(calls.some((c) => c.table === 'catch_locations')).toBe(false);
});
