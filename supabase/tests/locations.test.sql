begin;
\i supabase/tests/00_helpers.sql
select plan(7);

select tests_member('a@x.es', 'Ana') as a \gset
select tests_member('b@x.es', 'Bea') as b \gset

select tests_login(:'a');
insert into outings (id, owner_id, started_at, mode) values ('11111111-1111-1111-1111-111111111111', :'a', now(), 'spinning');
insert into catches (id, outing_id, user_id, species_id, caught_at)
  values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', :'a', 'dorada', now());
insert into catch_locations (catch_id, lat, lng) values ('22222222-2222-2222-2222-222222222222', 36.5271, -6.2886);
insert into outing_locations (outing_id, lat, lng) values ('11111111-1111-1111-1111-111111111111', 36.5271, -6.2886);
select is((select count(*) from catch_locations), 1::bigint, 'la autora ve su ubicación exacta');
select tests_logout();

select tests_login(:'b');
select is((select approx_lat from catches where id = '22222222-2222-2222-2222-222222222222'), 36.525::numeric, 'latitud aproximada');
select is((select approx_lng from catches where id = '22222222-2222-2222-2222-222222222222'), -6.275::numeric, 'longitud aproximada');
select is((select count(*) from catch_locations), 0::bigint, 'otro miembro no ve la ubicación exacta');
select is((select count(*) from outing_locations), 0::bigint, 'otro miembro no ve la ubicación exacta de la jornada');
select tests_logout();

select tests_login(:'a');
update catches set share_exact = true where id = '22222222-2222-2222-2222-222222222222';
select tests_logout();

select tests_login(:'b');
select is((select count(*) from catch_locations), 1::bigint, 'si se comparte, otro miembro la ve');
update catch_locations set lat = 0 where catch_id = '22222222-2222-2222-2222-222222222222';
select is((select lat from catch_locations), 36.5271::numeric, 'la ubicación ajena no cambia');

select * from finish();
rollback;
