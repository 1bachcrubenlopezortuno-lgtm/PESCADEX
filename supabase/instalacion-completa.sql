-- PESCADEX: instalación completa en un solo paso.
-- Pega TODO este archivo en Supabase → SQL Editor → New query y pulsa Run.
-- Al final te devuelve el código de invitación del grupo: apúntalo.

-- Pescadex: esquema inicial (fase 1)

-- ============ Configuración y catálogo ============
create table public.app_config (
  id int primary key check (id = 1),
  invite_code text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

create table public.species (
  id text primary key,
  common_name text not null,
  rarity text not null check (rarity in ('comun','poco_comun','rara','epica','legendaria')),
  legal text not null check (legal in ('libre','regulada','protegida'))
);
alter table public.species enable row level security;

-- ============ Perfiles y pertenencia al grupo ============
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  avatar_path text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create function public.is_member() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid()) $$;

create function public.join_group(code text, name text) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.app_config where id = 1 and invite_code = code) then
    raise exception 'invalid_invite';
  end if;
  insert into public.profiles (id, display_name) values (auth.uid(), trim(name))
  on conflict (id) do update set display_name = excluded.display_name
  returning * into p;
  return p;
end $$;
revoke execute on function public.join_group(text, text) from anon;

-- ============ Jornadas ============
create table public.outings (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  mode text not null check (mode in ('surfcasting','spinning','barco','embalse','rio','otra')),
  note text,
  share_exact boolean not null default false,
  approx_lat numeric,
  approx_lng numeric,
  created_at timestamptz not null default now()
);
alter table public.outings enable row level security;

create table public.outing_companions (
  outing_id uuid not null references public.outings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (outing_id, user_id)
);
alter table public.outing_companions enable row level security;

create function public.is_outing_owner(o uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.outings where id = o and owner_id = auth.uid()) $$;

create function public.can_add_to_outing(o uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_outing_owner(o)
   or exists (select 1 from public.outing_companions where outing_id = o and user_id = auth.uid()) $$;

-- ============ Capturas ============
create table public.catches (
  id uuid primary key,
  outing_id uuid not null references public.outings (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  species_id text not null references public.species (id),
  caught_at timestamptz not null,
  weight_g int check (weight_g > 0),
  length_cm numeric check (length_cm > 0),
  bait text,
  note text,
  share_exact boolean not null default false,
  approx_lat numeric,
  approx_lng numeric,
  created_at timestamptz not null default now()
);
alter table public.catches enable row level security;
create index on public.catches (user_id);
create index on public.catches (outing_id);

create function public.reject_protected_species() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.species where id = new.species_id and legal = 'protegida') then
    raise exception 'protected_species';
  end if;
  return new;
end $$;
create trigger catches_reject_protected before insert or update of species_id on public.catches
for each row execute function public.reject_protected_species();

create table public.catch_photos (
  id uuid primary key default gen_random_uuid(),
  catch_id uuid not null references public.catches (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
alter table public.catch_photos enable row level security;
create index on public.catch_photos (catch_id);

create function public.is_catch_author(c uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.catches where id = c and user_id = auth.uid()) $$;

-- ============ Ubicaciones exactas (privadas) ============
create function public.approx_coord(v numeric) returns numeric
language sql immutable as $$ select floor(v / 0.05) * 0.05 + 0.025 $$;

create table public.catch_locations (
  catch_id uuid primary key references public.catches (id) on delete cascade,
  lat numeric not null check (lat between -90 and 90),
  lng numeric not null check (lng between -180 and 180)
);
alter table public.catch_locations enable row level security;

create table public.outing_locations (
  outing_id uuid primary key references public.outings (id) on delete cascade,
  lat numeric not null check (lat between -90 and 90),
  lng numeric not null check (lng between -180 and 180)
);
alter table public.outing_locations enable row level security;

create function public.set_catch_approx() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.catches set approx_lat = approx_coord(new.lat), approx_lng = approx_coord(new.lng)
  where id = new.catch_id;
  return new;
end $$;
create trigger catch_locations_approx after insert or update on public.catch_locations
for each row execute function public.set_catch_approx();

create function public.set_outing_approx() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.outings set approx_lat = approx_coord(new.lat), approx_lng = approx_coord(new.lng)
  where id = new.outing_id;
  return new;
end $$;
create trigger outing_locations_approx after insert or update on public.outing_locations
for each row execute function public.set_outing_approx();

-- ============ Políticas RLS ============
create policy species_read on public.species for select to authenticated using (public.is_member());

create policy profiles_read on public.profiles for select to authenticated using (public.is_member());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy outings_read on public.outings for select to authenticated using (public.is_member());
create policy outings_insert on public.outings for insert to authenticated
  with check (public.is_member() and owner_id = auth.uid());
create policy outings_update on public.outings for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy outings_delete on public.outings for delete to authenticated using (owner_id = auth.uid());

create policy companions_read on public.outing_companions for select to authenticated using (public.is_member());
create policy companions_insert on public.outing_companions for insert to authenticated
  with check (public.is_outing_owner(outing_id));
create policy companions_delete on public.outing_companions for delete to authenticated
  using (public.is_outing_owner(outing_id));

create policy catches_read on public.catches for select to authenticated using (public.is_member());
create policy catches_insert on public.catches for insert to authenticated
  with check (public.is_member() and user_id = auth.uid() and public.can_add_to_outing(outing_id));
create policy catches_update on public.catches for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_add_to_outing(outing_id));
create policy catches_delete on public.catches for delete to authenticated using (user_id = auth.uid());

create policy photos_read on public.catch_photos for select to authenticated using (public.is_member());
create policy photos_insert on public.catch_photos for insert to authenticated
  with check (
    public.is_catch_author(catch_id)
    and path like auth.uid()::text || '/' || catch_id::text || '/%'
  );
create policy photos_delete on public.catch_photos for delete to authenticated
  using (public.is_catch_author(catch_id));

create policy catch_loc_read on public.catch_locations for select to authenticated using (
  public.is_catch_author(catch_id)
  or (public.is_member() and exists (select 1 from public.catches c where c.id = catch_id and c.share_exact))
);
create policy catch_loc_write on public.catch_locations for insert to authenticated
  with check (public.is_catch_author(catch_id));
create policy catch_loc_update on public.catch_locations for update to authenticated
  using (public.is_catch_author(catch_id)) with check (public.is_catch_author(catch_id));
create policy catch_loc_delete on public.catch_locations for delete to authenticated
  using (public.is_catch_author(catch_id));

create policy outing_loc_read on public.outing_locations for select to authenticated using (
  public.is_outing_owner(outing_id)
  or (public.is_member() and exists (select 1 from public.outings o where o.id = outing_id and o.share_exact))
);
create policy outing_loc_write on public.outing_locations for insert to authenticated
  with check (public.is_outing_owner(outing_id));
create policy outing_loc_update on public.outing_locations for update to authenticated
  using (public.is_outing_owner(outing_id)) with check (public.is_outing_owner(outing_id));
create policy outing_loc_delete on public.outing_locations for delete to authenticated
  using (public.is_outing_owner(outing_id));

-- ============ Almacenamiento de fotos ============
insert into storage.buckets (id, name, public) values ('catch-photos', 'catch-photos', false)
on conflict (id) do nothing;

create policy "fotos: miembros leen" on storage.objects for select to authenticated
  using (bucket_id = 'catch-photos' and public.is_member());
create policy "fotos: subir a la carpeta propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'catch-photos' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: borrar las propias" on storage.objects for delete to authenticated
  using (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Una jornada solo se puede borrar si no tiene capturas de otros participantes:
-- así nadie pierde sus peces porque el creador borre la jornada.
create function public.protect_others_catches() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.catches where outing_id = old.id and user_id <> old.owner_id) then
    raise exception 'outing_has_others_catches';
  end if;
  return old;
end $$;

create trigger outings_protect_others_catches before delete on public.outings
for each row execute function public.protect_others_catches();

-- Generado por scripts/gen-species-seed.ts a partir de src/catalog/species.json. No editar a mano.
insert into public.species (id, common_name, rarity, legal) values
  ('barbo-gitano', 'Barbo gitano', 'comun', 'libre'),
  ('barbo-comizo', 'Barbo comizo', 'rara', 'libre'),
  ('boga-guadiana', 'Boga del Guadiana', 'poco_comun', 'libre'),
  ('cacho', 'Cacho', 'comun', 'libre'),
  ('trucha-comun', 'Trucha común', 'epica', 'regulada'),
  ('anguila', 'Anguila', 'legendaria', 'protegida'),
  ('sabalo', 'Sábalo', 'legendaria', 'protegida'),
  ('saboga', 'Saboga', 'legendaria', 'protegida'),
  ('jarabugo', 'Jarabugo', 'legendaria', 'protegida'),
  ('calandino', 'Calandino', 'legendaria', 'protegida'),
  ('colmilleja', 'Colmilleja', 'legendaria', 'protegida'),
  ('lisas', 'Lisas y mújoles', 'comun', 'libre'),
  ('black-bass', 'Black bass', 'poco_comun', 'libre'),
  ('carpa', 'Carpa común', 'comun', 'libre'),
  ('carpin', 'Carpín', 'comun', 'libre'),
  ('tenca', 'Tenca', 'poco_comun', 'libre'),
  ('lucio', 'Lucio', 'rara', 'libre'),
  ('lucioperca', 'Lucioperca', 'rara', 'libre'),
  ('siluro', 'Siluro', 'legendaria', 'libre'),
  ('pez-sol', 'Pez sol', 'comun', 'libre'),
  ('alburno', 'Alburno', 'comun', 'libre'),
  ('gobio', 'Gobio', 'comun', 'libre'),
  ('pez-gato', 'Pez gato negro', 'poco_comun', 'libre'),
  ('trucha-arcoiris', 'Trucha arcoíris', 'poco_comun', 'libre'),
  ('gambusia', 'Gambusia', 'comun', 'libre'),
  ('dorada', 'Dorada', 'poco_comun', 'libre'),
  ('sargo', 'Sargo común', 'comun', 'libre'),
  ('sargo-picudo', 'Sargo picudo', 'poco_comun', 'libre'),
  ('sargo-breado', 'Sargo breado', 'rara', 'libre'),
  ('mojarra', 'Mojarra', 'comun', 'libre'),
  ('raspallon', 'Raspallón', 'comun', 'libre'),
  ('herrera', 'Herrera', 'poco_comun', 'libre'),
  ('salema', 'Salema', 'comun', 'libre'),
  ('oblada', 'Oblada', 'comun', 'libre'),
  ('boga', 'Boga', 'comun', 'libre'),
  ('chopa', 'Chopa', 'comun', 'libre'),
  ('breca', 'Breca', 'poco_comun', 'libre'),
  ('aligote', 'Aligote', 'comun', 'libre'),
  ('besugo', 'Besugo / Voraz', 'rara', 'regulada'),
  ('pargo', 'Pargo', 'rara', 'libre'),
  ('urta', 'Urta', 'epica', 'libre'),
  ('denton', 'Dentón', 'epica', 'libre'),
  ('sama', 'Sama', 'rara', 'libre'),
  ('lubina', 'Lubina / Róbalo', 'poco_comun', 'libre'),
  ('baila', 'Baila', 'poco_comun', 'libre'),
  ('corvina', 'Corvina', 'epica', 'libre'),
  ('verrugato', 'Verrugato', 'rara', 'libre'),
  ('lenguado', 'Lenguado', 'poco_comun', 'libre'),
  ('salmonete', 'Salmonete de roca', 'poco_comun', 'libre'),
  ('serrano', 'Serrano', 'comun', 'libre'),
  ('vaquilla', 'Vaquilla', 'comun', 'libre'),
  ('mero', 'Mero', 'legendaria', 'regulada'),
  ('cabracho', 'Cabracho', 'rara', 'libre'),
  ('rascacio', 'Rascacio', 'poco_comun', 'libre'),
  ('pez-arana', 'Pez araña', 'comun', 'libre'),
  ('congrio', 'Congrio', 'poco_comun', 'libre'),
  ('morena', 'Morena', 'poco_comun', 'libre'),
  ('pez-ballesta', 'Pez ballesta', 'poco_comun', 'libre'),
  ('pejerrey', 'Pejerrey', 'comun', 'libre'),
  ('doncella', 'Doncella', 'comun', 'libre'),
  ('fredi', 'Fredi / Pez verde', 'comun', 'libre'),
  ('raya', 'Raya', 'poco_comun', 'libre'),
  ('caballa', 'Caballa', 'comun', 'libre'),
  ('jurel', 'Jurel', 'comun', 'libre'),
  ('anjova', 'Anjova', 'rara', 'libre'),
  ('palometa-blanca', 'Palometa blanca', 'poco_comun', 'libre'),
  ('lecha', 'Lecha / Palometón', 'epica', 'libre'),
  ('pez-limon', 'Pez limón', 'epica', 'libre'),
  ('bonito', 'Bonito', 'rara', 'libre'),
  ('melva', 'Melva', 'poco_comun', 'libre'),
  ('barracuda', 'Barracuda / Espetón', 'poco_comun', 'libre'),
  ('aguja', 'Aguja', 'comun', 'libre'),
  ('pez-sable', 'Pez sable', 'rara', 'libre'),
  ('atun-rojo', 'Atún rojo', 'legendaria', 'regulada'),
  ('pez-espada', 'Pez espada', 'legendaria', 'libre'),
  ('pulpo', 'Pulpo', 'poco_comun', 'libre'),
  ('choco', 'Choco / Sepia', 'poco_comun', 'libre'),
  ('calamar', 'Calamar', 'rara', 'libre')
on conflict (id) do update set common_name = excluded.common_name, rarity = excluded.rarity, legal = excluded.legal;

-- Código de invitación aleatorio
insert into public.app_config (id, invite_code) values (1, encode(gen_random_bytes(9), 'base64'))
on conflict (id) do update set invite_code = excluded.invite_code
returning invite_code;
