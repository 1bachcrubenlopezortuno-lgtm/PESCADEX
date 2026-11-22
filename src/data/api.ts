import type { GameCatch } from '../game/xp';
import { supabase } from './supabase';
import type { Catch, LatLng, NewCatch, NewOuting, Outing, Profile } from './types';

const PHOTO_BUCKET = 'catch-photos';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function toProfile(r: Row): Profile {
  return { id: r.id, displayName: r.display_name, avatarPath: r.avatar_path ?? null };
}

function latLng(lat: unknown, lng: unknown): LatLng | null {
  return lat == null || lng == null ? null : { lat: Number(lat), lng: Number(lng) };
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('not_authenticated');
  return data.user.id;
}

// ---------- Perfiles ----------
export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  fail(error);
  return data ? toProfile(data) : null;
}

export async function joinGroup(code: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase.rpc('join_group', { code: code.trim(), name: displayName.trim() });
  if (error) throw new Error(error.message.includes('invalid_invite') ? 'invalid_invite' : error.message);
  return toProfile(data as Row);
}

export async function updateMyName(displayName: string): Promise<void> {
  const id = await currentUserId();
  const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', id);
  fail(error);
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('display_name');
  fail(error);
  return (data ?? []).map(toProfile);
}

// ---------- Jornadas ----------
export async function createOuting(o: NewOuting): Promise<void> {
  const { error } = await supabase.from('outings').upsert(
    { id: o.id, started_at: o.startedAt, mode: o.mode, note: o.note ?? null, share_exact: o.shareExact },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  fail(error);
  if (o.companionIds.length) {
    const { error: e2 } = await supabase
      .from('outing_companions')
      .upsert(o.companionIds.map((user_id) => ({ outing_id: o.id, user_id })), { onConflict: 'outing_id,user_id', ignoreDuplicates: true });
    fail(e2);
  }
  if (o.location) {
    const { error: e3 } = await supabase.from('outing_locations').upsert({ outing_id: o.id, ...o.location });
    fail(e3);
  }
}

export async function endOuting(id: string, endedAt: string): Promise<void> {
  const { error } = await supabase.from('outings').update({ ended_at: endedAt }).eq('id', id);
  fail(error);
}

const OUTING_SELECT = '*, outing_companions(user_id), outing_locations(lat, lng)';

function toOuting(r: Row): Outing {
  const exact = Array.isArray(r.outing_locations) ? r.outing_locations[0] : r.outing_locations;
  return {
    id: r.id,
    ownerId: r.owner_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    mode: r.mode,
    note: r.note,
    companionIds: (r.outing_companions ?? []).map((c: Row) => c.user_id),
    approx: latLng(r.approx_lat, r.approx_lng),
    exact: exact ? latLng(exact.lat, exact.lng) : null,
    shareExact: r.share_exact,
  };
}

export async function listOutings(filter: { userId?: string } = {}): Promise<Outing[]> {
  const { data, error } = await supabase.from('outings').select(OUTING_SELECT).order('started_at', { ascending: false });
  fail(error);
  const all = (data ?? []).map(toOuting);
  return filter.userId ? all.filter((o) => o.ownerId === filter.userId || o.companionIds.includes(filter.userId!)) : all;
}

export async function getOuting(id: string): Promise<{ outing: Outing; catches: Catch[] }> {
  const { data, error } = await supabase.from('outings').select(OUTING_SELECT).eq('id', id).single();
  fail(error);
  return { outing: toOuting(data), catches: await listCatches({ outingId: id }) };
}

// ---------- Capturas ----------
export async function createCatch(c: NewCatch): Promise<void> {
  const { error } = await supabase.from('catches').upsert(
    {
      id: c.id,
      outing_id: c.outingId,
      species_id: c.speciesId,
      caught_at: c.caughtAt,
      weight_g: c.weightG ?? null,
      length_cm: c.lengthCm ?? null,
      bait: c.bait?.trim() || null,
      note: c.note?.trim() || null,
      share_exact: c.shareExact,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  fail(error);
  if (c.location) {
    const { error: e2 } = await supabase.from('catch_locations').upsert({ catch_id: c.id, ...c.location });
    fail(e2);
  }
}

export async function addCatchPhoto(catchId: string, photo: Blob): Promise<void> {
  const uid = await currentUserId();
  const path = `${uid}/${catchId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, photo, { contentType: 'image/jpeg' });
  fail(error);
  const { error: e2 } = await supabase.from('catch_photos').insert({ catch_id: catchId, path });
  fail(e2);
}

const CATCH_SELECT = '*, catch_photos(path, created_at), catch_locations(lat, lng)';

async function toCatches(rows: Row[]): Promise<Catch[]> {
  const paths = rows.flatMap((r) => (r.catch_photos ?? []).map((p: Row) => p.path as string));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((r) => {
    const exact = Array.isArray(r.catch_locations) ? r.catch_locations[0] : r.catch_locations;
    const photos = [...(r.catch_photos ?? [])].sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)));
    return {
      id: r.id,
      outingId: r.outing_id,
      userId: r.user_id,
      speciesId: r.species_id,
      caughtAt: r.caught_at,
      weightG: r.weight_g,
      lengthCm: r.length_cm == null ? null : Number(r.length_cm),
      bait: r.bait,
      note: r.note,
      shareExact: r.share_exact,
      approx: latLng(r.approx_lat, r.approx_lng),
      exact: exact ? latLng(exact.lat, exact.lng) : null,
      photoUrls: photos.map((p: Row) => urls.get(p.path) ?? ''), // una entrada por foto aunque falle la firma (el recuento da la XP)
    };
  });
}

export async function listCatches(filter: { userId?: string; outingId?: string } = {}): Promise<Catch[]> {
  let q = supabase.from('catches').select(CATCH_SELECT);
  if (filter.userId) q = q.eq('user_id', filter.userId);
  if (filter.outingId) q = q.eq('outing_id', filter.outingId);
  const { data, error } = await q.order('caught_at', { ascending: false });
  fail(error);
  return toCatches(data ?? []);
}

export async function getCatch(id: string): Promise<Catch> {
  const { data, error } = await supabase.from('catches').select(CATCH_SELECT).eq('id', id).single();
  fail(error);
  return (await toCatches([data]))[0];
}

export function toGameCatch(c: Catch): GameCatch {
  return { id: c.id, speciesId: c.speciesId, caughtAt: c.caughtAt, photoCount: c.photoUrls.length, weightG: c.weightG, lengthCm: c.lengthCm };
}
