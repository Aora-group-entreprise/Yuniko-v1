-- Fix Supabase Auth user provisioning for the canonical Yuniko schema.
-- The Auth trigger must create the matching canonical user/profile row atomically.

alter table yunikov_v1.profiles
  add column if not exists age integer
  check (age is null or age between 13 and 120);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  username_value text;
  display_name_value text;
  country_value text;
  age_value integer;
begin
  username_value := lower(coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    'user_' || substr(new.id::text, 1, 8)
  ));

  if username_value !~ '^[a-z0-9_.]{3,30}$' then
    username_value := 'user_' || substr(new.id::text, 1, 8);
  end if;

  display_name_value := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    'Yuniko User'
  );

  country_value := nullif(upper(new.raw_user_meta_data->>'country'), '');

  age_value := case
    when coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]+$'
      then (new.raw_user_meta_data->>'age')::integer
    else null
  end;

  if age_value is not null and (age_value < 13 or age_value > 120) then
    age_value := null;
  end if;

  insert into yunikov_v1.users (id, email, status)
  values (new.id, new.email, 'active'::yunikov_v1.user_status)
  on conflict (id) do update
    set email = excluded.email;

  insert into yunikov_v1.profiles (
    id, username, display_name, country_code, age
  )
  values (
    new.id, username_value::public.citext, display_name_value, country_value, age_value
  )
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        country_code = excluded.country_code,
        age = excluded.age;

  return new;
exception
  when unique_violation then
    raise exception 'Username is already taken.';
end;
$$;

drop trigger if exists on_auth_user_created_yuniko on auth.users;

create trigger on_auth_user_created_yuniko
after insert on auth.users
for each row
execute function public.handle_new_user();
