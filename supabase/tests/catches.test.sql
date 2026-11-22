begin;
\i supabase/tests/00_helpers.sql
select plan(6);

select tests_member('a@x.es', 'Ana') as a \gset
select tests_member('b@x.es', 'Bea') as b \gset
select tests_member('c@x.es', 'Carlos') as c \gset

select tests_login(:'a');
insert into outings (id, owner_id, started_at, mode) values ('11111111-1111-1111-1111-111111111111', :'a', now(), 'barco');
insert into outing_companions (outing_id, user_id) values ('11111111-1111-1111-1111-111111111111', :'b');
select throws_ok(
  $$ insert into catches (id, outing_id, species_id, caught_at) values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'anguila', now()) $$,
  'P0001', 'protected_species', 'no se puede registrar una especie protegida');
select tests_logout();

select tests_login(:'b');
select throws_ok(
  format($$ insert into catches (id, outing_id, user_id, species_id, caught_at) values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', %L, 'dorada', now()) $$, :'a'),
  '42501', null, 'no se puede registrar a nombre de otro');
select lives_ok(
  $$ insert into catches (id, outing_id, species_id, caught_at) values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'dorada', now()) $$,
  'un compañero etiquetado puede añadir capturas a la jornada');
select tests_logout();

select tests_login(:'c');
select throws_ok(
  $$ insert into catches (id, outing_id, species_id, caught_at) values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'dorada', now()) $$,
  '42501', null, 'quien no es compañero no puede añadir capturas');
select tests_logout();

select tests_login(:'a');
insert into catches (id, outing_id, species_id, caught_at) values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'sargo', now()) on conflict (id) do nothing;
insert into catches (id, outing_id, species_id, caught_at) values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'sargo', now()) on conflict (id) do nothing;
select is((select count(*) from catches where id = '33333333-3333-3333-3333-333333333333'), 1::bigint, 'insertar dos veces el mismo id deja una fila');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('catch-photos', 'otro-usuario/x/y.jpg') $$,
  '42501', null, 'no se puede subir una foto a la carpeta de otro');

select * from finish();
rollback;
