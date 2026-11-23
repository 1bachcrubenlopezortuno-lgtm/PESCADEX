-- PESCADEX · Actualización 4: equipo de cada captura.
-- Pega este archivo en Supabase → SQL Editor → New query y pulsa Run (solo una vez).

-- Equipo con el que se hizo cada captura (caña, carrete, línea…).
alter table public.catches add column if not exists gear text check (length(gear) <= 120);
