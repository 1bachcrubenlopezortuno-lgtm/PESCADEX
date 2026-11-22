-- Helpers compartidos por los tests (se cargan antes de cada archivo *.test.sql).
create or replace function tests_create_user(email text) returns uuid language sql as
$$ insert into auth.users (id, email) values (gen_random_uuid(), email) returning id $$;

create or replace function tests_login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function tests_logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function tests_member(email text, name text) returns uuid language plpgsql as $$
declare uid uuid;
begin
  uid := tests_create_user(email);
  insert into public.profiles (id, display_name) values (uid, name);
  return uid;
end $$;
