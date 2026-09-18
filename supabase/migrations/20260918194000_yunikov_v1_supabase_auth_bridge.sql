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


-- Canonical post-like interaction access and event telemetry.
alter table yunikov_v1.likes enable row level security;
drop policy if exists likes_select_self on yunikov_v1.likes;
create policy likes_select_self on yunikov_v1.likes
for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists likes_insert_self on yunikov_v1.likes;
create policy likes_insert_self on yunikov_v1.likes
for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists likes_delete_self on yunikov_v1.likes;
create policy likes_delete_self on yunikov_v1.likes
for delete to authenticated
using ((select auth.uid()) = user_id);

alter table yunikov_v1.events enable row level security;
drop policy if exists events_insert_self on yunikov_v1.events;
create policy events_insert_self on yunikov_v1.events
for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists events_select_self on yunikov_v1.events;
create policy events_select_self on yunikov_v1.events
for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists likes_post_id_idx on yunikov_v1.likes(post_id);


-- Keep reply counters authoritative in PostgreSQL.
create or replace function yunikov_v1.sync_comment_reply_count()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.deleted_at is null and new.parent_id is not null then
    update yunikov_v1.comments set reply_count = reply_count + 1 where id = new.parent_id;
  elsif tg_op = 'DELETE' and old.deleted_at is null and old.parent_id is not null then
    update yunikov_v1.comments set reply_count = greatest(0, reply_count - 1) where id = old.parent_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_comment_reply_count on yunikov_v1.comments;
create trigger trg_comment_reply_count
after insert or delete on yunikov_v1.comments
for each row execute function yunikov_v1.sync_comment_reply_count();


-- Keep save/share counters authoritative in PostgreSQL.
create or replace function yunikov_v1.sync_post_save_count()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update yunikov_v1.posts set save_count = save_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update yunikov_v1.posts set save_count = greatest(0, save_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_post_save_count on yunikov_v1.saves;
create trigger trg_post_save_count
after insert or delete on yunikov_v1.saves
for each row execute function yunikov_v1.sync_post_save_count();

create or replace function yunikov_v1.sync_post_share_count()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update yunikov_v1.posts set share_count = share_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update yunikov_v1.posts set share_count = greatest(0, share_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_post_share_count on yunikov_v1.shares;
create trigger trg_post_share_count
after insert or delete on yunikov_v1.shares
for each row execute function yunikov_v1.sync_post_share_count();

create index if not exists saves_post_id_idx on yunikov_v1.saves(post_id);
create index if not exists shares_post_id_idx on yunikov_v1.shares(post_id);

-- Feed pagination, seen-post retention and ranking access indexes.
create index if not exists posts_feed_created_id_idx
on yunikov_v1.posts(created_at desc, id desc)
where deleted_at is null and status = 'ready';

create index if not exists seen_posts_user_seen_at_idx
on yunikov_v1.seen_posts(user_id, seen_at desc);

create index if not exists follows_follower_status_idx
on yunikov_v1.follows(follower_id, status, following_id);

create index if not exists user_affinity_user_target_idx
on yunikov_v1.user_affinity(user_id, target_user_id);

create index if not exists user_topic_affinity_user_topic_idx
on yunikov_v1.user_topic_affinity(user_id, topic_id);

-- Recommendation affinity updates and distribution indexes.
create or replace function yunikov_v1.update_affinity_from_event()
returns trigger language plpgsql set search_path = '' as $$
declare target uuid;
declare delta real;
begin
  if new.post_id is null or new.user_id is null then return new; end if;
  select author_id into target from yunikov_v1.posts where id = new.post_id;
  if target is null or target = new.user_id then return new; end if;
  delta := case new.type
    when 'like.created' then 1.0
    when 'comment.created' then 3.0
    when 'save.created' then 4.0
    when 'share.created' then 5.0
    when 'post.viewed' then 0.25
    else 0.0 end;
  if delta > 0 then
    insert into yunikov_v1.user_affinity(user_id,target_user_id,score,updated_at)
    values(new.user_id,target,delta,now())
    on conflict (user_id,target_user_id)
    do update set score = least(100, greatest(0, yunikov_v1.user_affinity.score * 0.995 + excluded.score)),
                  updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_affinity_from_event on yunikov_v1.events;
create trigger trg_update_affinity_from_event
after insert on yunikov_v1.events
for each row execute function yunikov_v1.update_affinity_from_event();

create index if not exists post_distribution_status_stage_idx
on yunikov_v1.post_distribution(status, stage, last_eval_at);

create index if not exists post_distribution_countries_gin_idx
on yunikov_v1.post_distribution using gin(countries);


-- Atomic post publication: all relational writes commit or roll back together.
create or replace function yunikov_v1.create_post_atomic(
  p_id uuid,
  p_caption text,
  p_visibility yunikov_v1.post_visibility,
  p_created_at timestamptz,
  p_media jsonb
)
returns table(post_id uuid, status yunikov_v1.post_status)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := yunikov_v1.app_current_user_id();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_id is null then raise exception 'Post id is required'; end if;
  if jsonb_typeof(coalesce(p_media, '[]'::jsonb)) <> 'array' then raise exception 'Media must be an array'; end if;

  insert into yunikov_v1.posts(id, author_id, caption, visibility, status, created_at)
  values(p_id, v_user_id, nullif(trim(p_caption), ''), p_visibility, 'ready', p_created_at);

  insert into yunikov_v1.post_media(id, post_id, url, width, height, blurhash, position, status, object_key)
  select
    (item->>'id')::uuid, p_id, item->>'url',
    nullif(item->>'width', '')::integer,
    nullif(item->>'height', '')::integer,
    nullif(item->>'blurhash', ''),
    coalesce((item->>'position')::integer, 0), 'ready', item->>'object_key'
  from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) item;

  insert into yunikov_v1.post_stats(post_id) values(p_id) on conflict(post_id) do nothing;
  insert into yunikov_v1.post_distribution(post_id, stage, countries)
  values(p_id, 1, '[]'::jsonb) on conflict(post_id) do nothing;

  insert into yunikov_v1.events(user_id, post_id, type, weight)
  values(v_user_id, p_id, 'post.created'::yunikov_v1.event_type, 1);

  return query select p_id, 'ready'::yunikov_v1.post_status;
end;
$$;

revoke all on function yunikov_v1.create_post_atomic(uuid,text,yunikov_v1.post_visibility,timestamptz,jsonb) from public;
grant execute on function yunikov_v1.create_post_atomic(uuid,text,yunikov_v1.post_visibility,timestamptz,jsonb) to authenticated;


-- Persist story captions instead of keeping them only in client memory.
alter table yunikov_v1.stories add column if not exists caption text;


-- Atomic share recording keeps the share row and event consistent.
create or replace function yunikov_v1.record_share_atomic(
  p_post_id uuid, p_user_id uuid, p_channel text
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_user_id is null then raise exception 'Authentication required'; end if;
  if p_channel is null or length(trim(p_channel)) = 0 then raise exception 'Share channel is required'; end if;
  insert into yunikov_v1.shares(post_id,user_id,channel) values(p_post_id,p_user_id,left(trim(p_channel),40));
  insert into yunikov_v1.events(user_id,post_id,type,weight) values(p_user_id,p_post_id,'share.created'::yunikov_v1.event_type,5);
end;
$$;
revoke all on function yunikov_v1.record_share_atomic(uuid,uuid,text) from public;
grant execute on function yunikov_v1.record_share_atomic(uuid,uuid,text) to authenticated;
