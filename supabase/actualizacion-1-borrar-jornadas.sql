-- PESCADEX · Actualización 1: proteger las capturas de otros al borrar una jornada.
-- Pega este archivo en Supabase → SQL Editor → New query y pulsa Run (solo una vez).

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
