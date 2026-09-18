-- Phase 1: bind the canonical yunikov_v1 domain model to Supabase Auth.

alter table yunikov_v1.profiles add column if not exists website text check (website is null or char_length(website) <= 2048);
alter table yunikov_v1.profiles add column if not exists banner_url text;
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
  values (new.id, username_value::public.citext, display_name_value, country_value)
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        country_code = excluded.country_code;

  return new;
end;
$$;


create or replace function yunikov_v1.create_profile_for_user()
returns trigger language plpgsql set search_path = '' as $$
begin
  insert into yunikov_v1.profiles (id, username, display_name)
  values (new.id, ('user_' || substr(new.id::text, 1, 8))::public.citext, 'New user')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function yunikov_v1.sync_follow_counts()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'accepted' then
    update yunikov_v1.profiles set following_count = following_count + 1 where id = new.follower_id;
    update yunikov_v1.profiles set follower_count = follower_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' and old.status = 'accepted' then
    update yunikov_v1.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update yunikov_v1.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
  elsif tg_op = 'UPDATE' then
    if old.status <> 'accepted' and new.status = 'accepted' then
      update yunikov_v1.profiles set following_count = following_count + 1 where id = new.follower_id;
      update yunikov_v1.profiles set follower_count = follower_count + 1 where id = new.following_id;
    elsif old.status = 'accepted' and new.status <> 'accepted' then
      update yunikov_v1.profiles set following_count = greatest(0, following_count - 1) where id = new.follower_id;
      update yunikov_v1.profiles set follower_count = greatest(0, follower_count - 1) where id = new.following_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function yunikov_v1.sync_post_comment_count()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.deleted_at is null then
    update yunikov_v1.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and old.deleted_at is null then
    update yunikov_v1.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function yunikov_v1.sync_post_like_count()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update yunikov_v1.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update yunikov_v1.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function yunikov_v1.touch_post_processing_job_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "conversations_member_read" on yunikov_v1.conversations;
create policy "conversations_member_read" on yunikov_v1.conversations
for select to authenticated
using (exists (
  select 1 from yunikov_v1.conversation_members m
  where m.conversation_id = conversations.id
    and m.user_id = yunikov_v1.app_current_user_id()
));


-- Keep the canonical schema reachable through Supabase PostgREST.
alter role authenticator set pgrst.db_schemas = 'public, yunikov_v1';
notify pgrst;


-- Canonical post media storage. Public reads are intentional for public feed media.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('post-media','post-media',true,20971520,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "post_media_public_read" on storage.objects;
create policy "post_media_public_read" on storage.objects for select to public
using (bucket_id='post-media');

drop policy if exists "post_media_insert_own" on storage.objects;
create policy "post_media_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "post_media_update_own" on storage.objects;
create policy "post_media_update_own" on storage.objects for update to authenticated
using (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "post_media_delete_own" on storage.objects;
create policy "post_media_delete_own" on storage.objects for delete to authenticated
using (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
