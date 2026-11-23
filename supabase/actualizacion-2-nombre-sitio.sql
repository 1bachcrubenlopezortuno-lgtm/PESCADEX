-- PESCADEX · Actualización 2: nombre del sitio en las jornadas.
-- Pega este archivo en Supabase → SQL Editor → New query y pulsa Run (solo una vez).

-- Nombre del sitio de una jornada (p. ej. "Playa de la Fontanilla"), visible para el grupo.
alter table public.outings add column if not exists place_name text check (length(place_name) <= 80);
