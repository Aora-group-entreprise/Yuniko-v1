-- Keep Supabase Auth signup bound only to the canonical yunikov_v1 profile model.
-- The legacy public.profiles mirror is no longer touched by the auth trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  username_value text;
  display_name_value text;
  country_value text;
  age_value integer;
begin
  username_value := lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || substr(new.id::text, 1, 8)));
  display_name_value := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Yuniko User');
  country_value := nullif(upper(new.raw_user_meta_data->>'country'), '');
  age_value := case
    when coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]+$'
      then (new.raw_user_meta_data->>'age')::integer
    else null
  end;

  insert into yunikov_v1.users (id, email, status)
  values (new.id, new.email, 'active'::yunikov_v1.user_status)
  on conflict (id) do update
    set email = excluded.email;

  insert into yunikov_v1.profiles (id, username, display_name, country_code)
  values (new.id, username_value::public.citext, display_name_value, country_value)
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        country_code = excluded.country_code;

  return new;
exception
  when unique_violation then
    raise exception 'Username is already taken.';
end;
$$;