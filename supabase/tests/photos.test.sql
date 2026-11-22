begin;
\i supabase/tests/00_helpers.sql
select plan(2);

select tests_member('a@x.es', 'Ana') as a \gset
select tests_login(:'a');
insert into outings (id, owner_id, started_at, mode) values ('11111111-1111-1111-1111-111111111111', :'a', now(), 'spinning');
insert into catches (id, outing_id, species_id, caught_at) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'dorada', now());

select throws_ok(
  $$ insert into catch_photos (catch_id, path) values ('22222222-2222-2222-2222-222222222222', 'x') $$,
  '42501', null, 'no se puede registrar una foto con una ruta inventada');
select lives_ok(
  format($$ insert into catch_photos (catch_id, path) values ('22222222-2222-2222-2222-222222222222', '%s/22222222-2222-2222-2222-222222222222/f.jpg') $$, :'a'),
  'la ruta propia de la captura se acepta');

select * from finish();
rollback;
