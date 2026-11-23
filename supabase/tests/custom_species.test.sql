begin;
\i supabase/tests/00_helpers.sql
select plan(6);

select tests_member('a@x.es', 'Ana') as a \gset
select tests_create_user('x@x.es') as x \gset

select tests_login(:'a');
select lives_ok(
  format($$ insert into species (id, common_name, rarity, legal, created_by, habitats) values ('custom-pez-luna-ab12', 'Pez luna', 'rara', 'libre', %L, '{mar}') $$, :'a'),
  'un miembro crea una especie');
select is((select created_by from species where id = 'custom-pez-luna-ab12'), :'a'::uuid, 'queda como autora');
select throws_ok(
  format($$ insert into species (id, common_name, rarity, legal, created_by) values ('custom-x-1', 'X', 'rara', 'protegida', %L) $$, :'a'),
  '42501', null, 'no puede crear especies protegidas');
select throws_ok(
  $$ insert into species (id, common_name, rarity, legal, created_by) values ('dorada2', 'Otra', 'rara', 'libre', null) $$,
  '42501', null, 'no puede crear especies del catálogo base');
select lives_ok(
  $$ insert into catches (id, outing_id, species_id, caught_at)
     select gen_random_uuid(), o.id, 'custom-pez-luna-ab12', now() from (select '11111111-1111-1111-1111-111111111111'::uuid as id) o
     where false $$, 'consulta válida');
select tests_logout();

select tests_login(:'x');
select throws_ok(
  format($$ insert into species (id, common_name, rarity, legal, created_by) values ('custom-y-1', 'Y', 'rara', 'libre', %L) $$, :'x'),
  '42501', null, 'quien no es del grupo no puede crear especies');

select * from finish();
rollback;
