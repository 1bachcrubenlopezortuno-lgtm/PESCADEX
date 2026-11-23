#!/usr/bin/env bash
# Regenera supabase/instalacion-completa.sql (migraciones + especies + código de invitación).
set -euo pipefail
cd "$(dirname "$0")/.."
{
  echo "-- PESCADEX: instalación completa en un solo paso (proyecto nuevo)."
  echo "-- Pega TODO este archivo en Supabase → SQL Editor → New query y pulsa Run."
  echo "-- Al final te devuelve el código de invitación del grupo: apúntalo."
  echo
  for f in supabase/migrations/*.sql; do cat "$f"; echo; done
  cat supabase/seed.sql
  echo
  echo "-- Código de invitación aleatorio"
  echo "insert into public.app_config (id, invite_code) values (1, encode(gen_random_bytes(9), 'base64'))"
  echo "on conflict (id) do update set invite_code = excluded.invite_code"
  echo "returning invite_code;"
} > supabase/instalacion-completa.sql
