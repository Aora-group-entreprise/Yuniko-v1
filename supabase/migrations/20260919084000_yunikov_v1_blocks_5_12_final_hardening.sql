-- Final hardening for blocks 5-12: canonical authenticated RLS and story view telemetry.

-- Remove legacy public-role policies that duplicate or broaden canonical authenticated access.
drop policy if exists blocks_self on yunikov_v1.blocks;
drop policy if exists blocks_self_delete on yunikov_v1.blocks;
drop policy if exists blocks_self_insert on yunikov_v1.blocks;
drop policy if exists blocks_self_read on yunikov_v1.blocks;

drop policy if exists comments_delete on yunikov_v1.comments;
drop policy if exists comments_insert on yunikov_v1.comments;
drop policy if exists comments_update on yunikov_v1.comments;

drop policy if exists follows_delete_self on yunikov_v1.follows;
drop policy if exists follows_insert on yunikov_v1.follows;
drop policy if exists follows_update_target on yunikov_v1.follows;

drop policy if exists messages_member_read on yunikov_v1.messages;
drop policy if exists messages_sender_insert on yunikov_v1.messages;
drop policy if exists messages_sender_update on yunikov_v1.messages;

drop policy if exists reports_own_read on yunikov_v1.reports;
drop policy if exists reports_self on yunikov_v1.reports;

drop policy if exists saves_self on yunikov_v1.saves;
drop policy if exists shares_self on yunikov_v1.shares;

drop policy if exists stories_write on yunikov_v1.stories;

-- Authenticated equivalents, with explicit ownership/member checks.
create policy comments_delete_authenticated on yunikov_v1.comments
for delete to authenticated
using (author_id = (select auth.uid()));

create policy comments_insert_authenticated on yunikov_v1.comments
for insert to authenticated
with check (author_id = (select auth.uid()));

create policy comments_update_authenticated on yunikov_v1.comments
for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy follows_delete_self_authenticated on yunikov_v1.follows
for delete to authenticated
using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

create policy follows_insert_authenticated on yunikov_v1.follows
for insert to authenticated
with check (follower_id = (select auth.uid()) and follower_id <> following_id);

create policy follows_update_target_authenticated on yunikov_v1.follows
for update to authenticated
using (following_id = (select auth.uid()))
with check (following_id = (select auth.uid()));

create policy messages_member_read_authenticated on yunikov_v1.messages
for select to authenticated
using (exists (
  select 1 from yunikov_v1.conversation_members m
  where m.conversation_id = messages.conversation_id
    and m.user_id = (select auth.uid())
));

create policy messages_sender_insert_authenticated on yunikov_v1.messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from yunikov_v1.conversation_members m
    where m.conversation_id = messages.conversation_id
      and m.user_id = (select auth.uid())
  )
);

create policy messages_sender_update_authenticated on yunikov_v1.messages
for update to authenticated
using (sender_id = (select auth.uid()))
with check (sender_id = (select auth.uid()));

create policy saves_self_authenticated on yunikov_v1.saves
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy shares_self_authenticated on yunikov_v1.shares
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy stories_write_authenticated on yunikov_v1.stories
for all to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

-- Story views are an interaction event as well as a view row.
create or replace function yunikov_v1.record_story_view_atomic(p_story_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_user_id uuid := yunikov_v1.app_current_user_id();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_story_id is null then raise exception 'Story id is required'; end if;

  insert into yunikov_v1.story_views(story_id, viewer_id, viewed_at)
  values(p_story_id, v_user_id, now())
  on conflict (story_id, viewer_id)
  do update set viewed_at = excluded.viewed_at;

  insert into yunikov_v1.events(user_id, type, weight, metadata)
  values(v_user_id, 'story.viewed'::yunikov_v1.event_type, 0.25,
         jsonb_build_object('story_id', p_story_id));
end;
$$;

revoke all on function yunikov_v1.record_story_view_atomic(uuid) from public;
grant execute on function yunikov_v1.record_story_view_atomic(uuid) to authenticated;
