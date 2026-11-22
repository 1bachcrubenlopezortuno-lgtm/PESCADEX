import { writeFileSync } from 'node:fs';
import { SPECIES } from '../src/catalog/catalog';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const rows = SPECIES.map((s) => `  (${q(s.id)}, ${q(s.commonName)}, ${q(s.rarity)}, ${q(s.legal)})`);
const sql = `-- Generado por scripts/gen-species-seed.ts a partir de src/catalog/species.json. No editar a mano.
insert into public.species (id, common_name, rarity, legal) values
${rows.join(',\n')}
on conflict (id) do update set common_name = excluded.common_name, rarity = excluded.rarity, legal = excluded.legal;
`;
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log(`seed.sql: ${SPECIES.length} especies`);
