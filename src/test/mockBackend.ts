// Estado compartido para los mocks de supabase y api en tests de pantallas.
import { vi } from 'vitest';
import type { Catch, Outing, Profile } from '../data/types';

export const backend = {
  session: null as null | { user: { id: string; email: string } },
  profile: null as Profile | null,
  profiles: [] as Profile[],
  catches: [] as Catch[],
  outings: [] as Outing[],
};

let n = 0;
export function makeCatch(over: Partial<Catch> = {}): Catch {
  n++;
  return {
    id: `c${n}`, outingId: 'o1', userId: 'u1', speciesId: 'dorada', caughtAt: `2026-01-01T10:${String(n % 60).padStart(2, '0')}:00Z`,
    weightG: null, lengthCm: null, bait: null, note: null, shareExact: false, approx: null, exact: null,
    photoUrls: ['https://foto/1.jpg'], ...over,
  };
}

export function makeOuting(over: Partial<Outing> = {}): Outing {
  n++;
  return {
    id: `o${n}`, ownerId: 'u1', startedAt: new Date().toISOString(), endedAt: null, mode: 'spinning', note: null,
    companionIds: [], approx: null, exact: null, shareExact: false, ...over,
  };
}

export function resetBackend() {
  backend.session = null;
  backend.profile = null;
  backend.profiles = [];
  backend.catches = [];
  backend.outings = [];
}

export const authMock = {
  getSession: vi.fn(async () => ({ data: { session: backend.session }, error: null })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
  signInWithPassword: vi.fn(async (): Promise<{ data: unknown; error: null | { message: string } }> => ({ data: {}, error: null })),
  signUp: vi.fn(async (): Promise<{ data: { session: unknown }; error: null | { message: string } }> => ({ data: { session: {} }, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

export function asMember(p: Profile = { id: 'u1', displayName: 'Ana', avatarPath: null }) {
  backend.session = { user: { id: p.id, email: 'ana@x.es' } };
  backend.profile = p;
}

/** Implementación en memoria de src/data/api para tests de pantallas. */
export async function apiMock() {
  const actual = await vi.importActual<typeof import('../data/api')>('../data/api');
  return {
    toGameCatch: actual.toGameCatch,
    getMyProfile: vi.fn(async () => backend.profile),
    joinGroup: vi.fn(async () => backend.profile),
    updateMyName: vi.fn(async () => {}),
    listProfiles: vi.fn(async () => backend.profiles),
    listCatches: vi.fn(async (f: { userId?: string; outingId?: string } = {}) =>
      backend.catches.filter((c) => (!f.userId || c.userId === f.userId) && (!f.outingId || c.outingId === f.outingId)),
    ),
    getCatch: vi.fn(async (id: string) => {
      const c = backend.catches.find((x) => x.id === id);
      if (!c) throw new Error('not_found');
      return c;
    }),
    listOutings: vi.fn(async (f: { userId?: string } = {}) =>
      backend.outings.filter((o) => !f.userId || o.ownerId === f.userId || o.companionIds.includes(f.userId)),
    ),
    getOuting: vi.fn(async (id: string) => ({
      outing: backend.outings.find((o) => o.id === id)!,
      catches: backend.catches.filter((c) => c.outingId === id),
    })),
    createOuting: vi.fn(async () => {}),
    endOuting: vi.fn(async () => {}),
    createCatch: vi.fn(async () => {}),
    deleteOuting: vi.fn(async () => {}),
    deleteCatch: vi.fn(async () => {}),
    addCatchPhoto: vi.fn(async () => {}),
  };
}
