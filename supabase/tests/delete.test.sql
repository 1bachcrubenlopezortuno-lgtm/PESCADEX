begin;
\i supabase/tests/00_helpers.sql
select plan(6);

select tests_member('a@x.es', 'Ana') as a \gset
select tests_member('b@x.es', 'Bea') as b \gset

select tests_login(:'a');
insert into outings (id, owner_id, started_at, mode) values
  ('11111111-1111-1111-1111-111111111111', :'a', now(), 'barco'),
  ('44444444-4444-4444-4444-444444444444', :'a', now(), 'spinning');
insert into outing_companions (outing_id, user_id) values ('11111111-1111-1111-1111-111111111111', :'b');
insert into catches (id, outing_id, species_id, caught_at) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'dorada', now()),
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'sargo', now());
select tests_logout();

select tests_login(:'b');
insert into catches (id, outing_id, species_id, caught_at) values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'sargo', now());
delete from outings where id = '44444444-4444-4444-4444-444444444444';
select is((select count(*) from outings where id = '44444444-4444-4444-4444-444444444444'), 1::bigint, 'quien no la creó no puede borrar la jornada');
select tests_logout();

select tests_login(:'a');
select throws_ok($$ delete from outings where id = '11111111-1111-1111-1111-111111111111' $$, 'P0001', 'outing_has_others_catches',
  'no se puede borrar una jornada con capturas de otros');
select lives_ok($$ delete from outings where id = '44444444-4444-4444-4444-444444444444' $$, 'la creadora borra su jornada');
select is((select count(*) from catches where id = '55555555-5555-5555-5555-555555555555'), 0::bigint, 'sus capturas se borran con ella');
select tests_logout();

select tests_login(:'b');
delete from catches where id = '33333333-3333-3333-3333-333333333333';
select is((select count(*) from catches where id = '33333333-3333-3333-3333-333333333333'), 0::bigint, 'cada uno borra su captura');
select tests_logout();

select tests_login(:'a');
select lives_ok($$ delete from outings where id = '11111111-1111-1111-1111-111111111111' $$, 'sin capturas ajenas ya se puede borrar');

select * from finish();
rollback;
