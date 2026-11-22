begin;
\i supabase/tests/00_helpers.sql
select plan(4);

insert into app_config (id, invite_code) values (1, 'boquerón') on conflict (id) do update set invite_code = excluded.invite_code;
select tests_member('a@x.es', 'Ana') as a \gset
insert into outings (id, owner_id, started_at, mode) values ('11111111-1111-1111-1111-111111111111', :'a', now(), 'spinning');
insert into catches (id, outing_id, user_id, species_id, caught_at)
  values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', :'a', 'dorada', now());

select tests_create_user('intruso@x.es') as x \gset
select tests_login(:'x');
select is((select count(*) from catches), 0::bigint, 'un usuario sin perfil no ve capturas');
select throws_ok($$ select join_group('mal', 'Intruso') $$, 'P0001', 'invalid_invite', 'código incorrecto rechazado');
select lives_ok($$ select join_group('boquerón', 'Nuevo') $$, 'código correcto crea el perfil');
select is((select count(*) from catches), 1::bigint, 'tras unirse ya ve las capturas');

select * from finish();
rollback;
