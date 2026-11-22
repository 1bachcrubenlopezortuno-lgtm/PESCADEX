#!/usr/bin/env bash
# Ejecuta los tests de base de datos en un Postgres local que imita Supabase.
# Uso: scripts/test-db.sh   (requiere postgres 16 + pgtap; usa el usuario postgres)
set -euo pipefail
cd "$(dirname "$0")/.."
DB=pescadex_test
PSQL="psql -v ON_ERROR_STOP=1 -q -X"
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "dropdb --if-exists $DB && createdb $DB"
run "$PSQL -d $DB -f supabase/shim/supabase_shim.sql" >/dev/null
for f in supabase/migrations/*.sql; do run "$PSQL -d $DB -f $f" >/dev/null; done
run "$PSQL -d $DB -f supabase/seed.sql" >/dev/null
run "cd $PWD && pg_prove -d $DB supabase/tests/*.test.sql"
