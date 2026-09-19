-- Final RLS/index cleanup for blocks 5-12.
drop policy if exists moderation_actions_none on yunikov_v1.moderation_actions;
drop policy if exists user_rate_limits_no_client_access on yunikov_v1.user_rate_limits;
drop policy if exists reports_owner_insert on yunikov_v1.reports;
drop policy if exists reports_owner_read on yunikov_v1.reports;
drop policy if exists stories_write_authenticated on yunikov_v1.stories;

create policy stories_insert_authenticated on yunikov_v1.stories
for insert to authenticated
with check (author_id = (select auth.uid()));
create policy stories_update_authenticated on yunikov_v1.stories
for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));
create policy stories_delete_authenticated on yunikov_v1.stories
for delete to authenticated
using (author_id = (select auth.uid()));

drop policy if exists post_hashtags_author_write on yunikov_v1.post_hashtags;
drop policy if exists post_hashtags_read on yunikov_v1.post_hashtags;
create policy post_hashtags_read_authenticated on yunikov_v1.post_hashtags
for select to authenticated
using (exists (select 1 from yunikov_v1.posts p where p.id = post_hashtags.post_id));
create policy post_hashtags_author_write_authenticated on yunikov_v1.post_hashtags
for all to authenticated
using (exists (select 1 from yunikov_v1.posts p where p.id=post_hashtags.post_id and p.author_id=(select auth.uid())))
with check (exists (select 1 from yunikov_v1.posts p where p.id=post_hashtags.post_id and p.author_id=(select auth.uid())));

drop policy if exists post_media_write on yunikov_v1.post_media;
create policy post_media_write_authenticated on yunikov_v1.post_media
for all to authenticated
using (exists (select 1 from yunikov_v1.posts p where p.id=post_media.post_id and p.author_id=(select auth.uid()) and p.deleted_at is null))
with check (exists (select 1 from yunikov_v1.posts p where p.id=post_media.post_id and p.author_id=(select auth.uid()) and p.deleted_at is null));

drop policy if exists post_stats_no_client_write on yunikov_v1.post_stats;
drop policy if exists post_distribution_no_client_write on yunikov_v1.post_distribution;
drop policy if exists user_topic_affinity_no_client_write on yunikov_v1.user_topic_affinity;
drop policy if exists user_topic_affinity_self on yunikov_v1.user_topic_affinity;
create policy user_topic_affinity_self_authenticated on yunikov_v1.user_topic_affinity
for select to authenticated using (user_id=(select auth.uid()));

drop index if exists yunikov_v1.likes_post_id_idx;
drop index if exists yunikov_v1.moderation_actions_entity_idx;
drop index if exists yunikov_v1.reports_dedupe_idx;
drop index if exists yunikov_v1.seen_posts_user_seen_at_idx;

-- Cover canonical foreign keys used by messaging/moderation cleanup.
create index if not exists comments_author_id_idx on yunikov_v1.comments(author_id);
create index if not exists messages_sender_id_idx on yunikov_v1.messages(sender_id);
create index if not exists notifications_actor_id_idx on yunikov_v1.notifications(actor_id);
create index if not exists moderation_actions_actor_id_idx on yunikov_v1.moderation_actions(actor_id);
create index if not exists moderation_actions_report_id_idx on yunikov_v1.moderation_actions(report_id);
create index if not exists login_events_user_id_idx on yunikov_v1.login_events(user_id);
