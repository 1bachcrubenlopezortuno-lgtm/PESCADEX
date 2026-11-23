import type { Habitat, Rarity, Species } from '../catalog/types';
import type { GameCatch } from '../game/xp';
import { supabase } from './supabase';
import type { Catch, LatLng, NewCatch, NewOuting, Outing, Profile } from './types';

const PHOTO_BUCKET = 'catch-photos';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function toProfile(r: Row): Profile {
  return { id: r.id, displayName: r.display_name, avatarPath: r.avatar_path ?? null, avatarUrl: null };
}

/** Firma las fotos de perfil de una tanda de perfiles. */
async function withAvatars(list: Profile[]): Promise<Profile[]> {
  const paths = list.map((p) => p.avatarPath).filter((x): x is string => Boolean(x));
  if (!paths.length) return list;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  const urls = new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path!, d.signedUrl]));
  return list.map((p) => ({ ...p, avatarUrl: p.avatarPath ? (urls.get(p.avatarPath) ?? null) : null }));
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
  return data ? (await withAvatars([toProfile(data)]))[0] : null;
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
  return withAvatars((data ?? []).map(toProfile));
}

export async function updateMyAvatar(path: string | null): Promise<void> {
  const id = await currentUserId();
  if (path && !path.startsWith(`${id}/`)) throw new Error('not_your_photo');
  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', id);
  fail(error);
}

// ---------- Jornadas ----------
export async function createOuting(o: NewOuting): Promise<void> {
  const { error } = await supabase.from('outings').upsert(
    { id: o.id, started_at: o.startedAt, ended_at: o.endedAt ?? null, mode: o.mode, note: o.note ?? null, place_name: o.placeName?.trim() || null, share_exact: o.shareExact },
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

/** Borra las fotos propias del almacenamiento (las filas se borran en cascada). */
async function removeMyPhotos(catchIds: string[]): Promise<void> {
  if (!catchIds.length) return;
  const uid = await currentUserId();
  const { data } = await supabase.from('catch_photos').select('path').in('catch_id', catchIds);
  const paths = (data ?? []).map((r: Row) => r.path as string).filter((p) => p.startsWith(`${uid}/`));
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
}

export async function deleteOuting(id: string): Promise<void> {
  const uid = await currentUserId();
  const { data } = await supabase.from('catches').select('id').eq('outing_id', id).eq('user_id', uid);
  const ids = (data ?? []).map((r: Row) => r.id as string);
  const { error } = await supabase.from('outings').delete().eq('id', id);
  if (error) throw new Error(error.message.includes('outing_has_others_catches') ? 'outing_has_others_catches' : error.message);
  await removeMyPhotos(ids).catch(() => {});
}

export async function deleteCatch(id: string): Promise<void> {
  await removeMyPhotos([id]).catch(() => {});
  const { error } = await supabase.from('catches').delete().eq('id', id);
  fail(error);
}

export interface OutingPatch {
  startedAt: string;
  endedAt?: string;
  mode: Outing['mode'];
  note?: string;
  placeName?: string;
  companionIds: string[];
  location: LatLng | null;
}

export async function updateOuting(id: string, p: OutingPatch): Promise<void> {
  const { error } = await supabase
    .from('outings')
    .update({ started_at: p.startedAt, ended_at: p.endedAt ?? null, mode: p.mode, note: p.note?.trim() || null, place_name: p.placeName?.trim() || null })
    .eq('id', id);
  fail(error);
  const { data } = await supabase.from('outing_companions').select('user_id').eq('outing_id', id);
  const current = (data ?? []).map((r: Row) => r.user_id as string);
  const removed = current.filter((u) => !p.companionIds.includes(u));
  const added = p.companionIds.filter((u) => !current.includes(u));
  if (removed.length) fail((await supabase.from('outing_companions').delete().eq('outing_id', id).in('user_id', removed)).error);
  if (added.length) fail((await supabase.from('outing_companions').insert(added.map((user_id) => ({ outing_id: id, user_id })))).error);
  if (p.location) fail((await supabase.from('outing_locations').upsert({ outing_id: id, ...p.location })).error);
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
    placeName: r.place_name ?? null,
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
      gear: c.gear?.trim() || null,
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
      photoPaths: photos.map((p: Row) => p.path as string),
      gear: r.gear ?? null,
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

// ---------- Especies añadidas por el grupo ----------
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function toSpecies(r: Row): Species {
  return {
    id: r.id,
    commonName: r.common_name,
    scientificName: r.scientific_name ?? '',
    habitats: (r.habitats ?? ['mar']) as Habitat[],
    group: 'Añadidas por el grupo',
    rarity: r.rarity,
    legal: 'libre',
    description: r.description || 'Especie añadida por el grupo.',
    bestMonths: ALL_MONTHS,
    zones: '—',
    createdBy: r.created_by ?? undefined,
  };
}

export async function listCustomSpecies(): Promise<Species[]> {
  const { data, error } = await supabase.from('species').select('*').not('created_by', 'is', null).order('created_at');
  fail(error);
  return (data ?? []).map(toSpecies);
}

export interface NewSpecies {
  commonName: string;
  scientificName?: string;
  habitats: Habitat[];
  rarity: Rarity;
  description?: string;
}

export async function createCustomSpecies(n: NewSpecies): Promise<Species> {
  const uid = await currentUserId();
  const slug = n.commonName.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const id = `custom-${slug || 'pez'}-${crypto.randomUUID().slice(0, 4)}`;
  const { data, error } = await supabase
    .from('species')
    .insert({
      id,
      common_name: n.commonName.trim(),
      scientific_name: n.scientificName?.trim() || null,
      habitats: n.habitats,
      rarity: n.rarity,
      legal: 'libre',
      description: n.description?.trim() || null,
      created_by: uid,
    })
    .select()
    .single();
  fail(error);
  return toSpecies(data);
}
