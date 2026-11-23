-- Especies añadidas por el grupo (peces que no están en el catálogo base).
alter table public.species
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists scientific_name text check (length(scientific_name) <= 80),
  add column if not exists habitats text[] not null default '{mar}',
  add column if not exists description text check (length(description) <= 400),
  add column if not exists created_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'species_common_name_len') then
    alter table public.species add constraint species_common_name_len check (length(trim(common_name)) between 1 and 40) not valid;
  end if;
end $$;

drop policy if exists species_insert_custom on public.species;
create policy species_insert_custom on public.species for insert to authenticated with check (
  public.is_member()
  and created_by = auth.uid()
  and legal = 'libre'
  and id like 'custom-%'
  and habitats <@ array['mar', 'dulce']::text[]
);
