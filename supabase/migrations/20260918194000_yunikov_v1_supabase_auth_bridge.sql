-- Phase 1: bind the canonical yunikov_v1 domain model to Supabase Auth.
-- The legacy public schema remains untouched and is not used by the application.

create or replace function yunikov_v1.app_current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select auth.uid()
$$;

grant usage on schema yunikov_v1 to anon, authenticated;

grant select on yunikov_v1.profiles, yunikov_v1.posts, yunikov_v1.post_media,
  yunikov_v1.comments, yunikov_v1.follows, yunikov_v1.likes, yunikov_v1.saves,
  yunikov_v1.shares, yunikov_v1.stories, yunikov_v1.story_views,
  yunikov_v1.notifications, yunikov_v1.events, yunikov_v1.conversation_members,
  yunikov_v1.messages
to anon, authenticated;

grant insert, update, delete on yunikov_v1.profiles, yunikov_v1.posts,
  yunikov_v1.post_media, yunikov_v1.comments, yunikov_v1.follows,
  yunikov_v1.likes, yunikov_v1.saves, yunikov_v1.shares, yunikov_v1.stories,
  yunikov_v1.story_views, yunikov_v1.notifications, yunikov_v1.events,
  yunikov_v1.conversation_members, yunikov_v1.messages
to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  username_value text;
  display_name_value text;
  country_value text;
begin
  username_value := lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || substr(new.id::text, 1, 8)));
  display_name_value := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Yuniko User');
  country_value := nullif(new.raw_user_meta_data->>'country', '');

  insert into yunikov_v1.users (id, email, status)
  values (new.id, new.email, 'active'::yunikov_v1.user_status)
  on conflict (id) do update
    set email = excluded.email;

  insert into yunikov_v1.profiles (id, username, display_name, country_code)
  values (new.id, username_value::citext, display_name_value, country_value)
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        country_code = excluded.country_code;

  return new;
end;
$$;
