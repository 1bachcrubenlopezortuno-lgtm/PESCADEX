// Estado compartido para los mocks de supabase y api en tests de pantallas.
import { vi } from 'vitest';
import type { Profile } from '../data/types';

export const backend = {
  session: null as null | { user: { id: string; email: string } },
  profile: null as Profile | null,
};

export const authMock = {
  getSession: vi.fn(async () => ({ data: { session: backend.session }, error: null })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
  signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
  verifyOtp: vi.fn(async () => ({ data: {}, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

export function asMember(p: Profile = { id: 'u1', displayName: 'Ana', avatarPath: null }) {
  backend.session = { user: { id: p.id, email: 'ana@x.es' } };
  backend.profile = p;
}
