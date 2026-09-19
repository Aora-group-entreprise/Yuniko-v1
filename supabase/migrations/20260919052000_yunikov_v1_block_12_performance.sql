create index if not exists posts_feed_cursor_idx
  on yunikov_v1.posts (created_at desc, id desc)
  where deleted_at is null;

create index if not exists posts_author_cursor_idx
  on yunikov_v1.posts (author_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists events_post_created_idx
  on yunikov_v1.events (post_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on yunikov_v1.notifications (recipient_id, created_at desc)
  where is_read = false;

create index if not exists messages_conversation_cursor_idx
  on yunikov_v1.messages (conversation_id, created_at desc, id desc);

create index if not exists seen_posts_user_seen_idx
  on yunikov_v1.seen_posts (user_id, seen_at desc);

create index if not exists stories_author_expiry_idx
  on yunikov_v1.stories (author_id, expires_at desc);

create index if not exists reports_entity_created_idx
  on yunikov_v1.reports (entity_type, entity_id, created_at desc);

create or replace function yunikov_v1.cleanup_expired_data()
returns void
language plpgsql
security definer
set search_path = pg_catalog, yunikov_v1
as $$
begin
  delete from yunikov_v1.seen_posts where seen_at < now() - interval '7 days';
  delete from yunikov_v1.stories where expires_at < now() - interval '24 hours';
  delete from yunikov_v1.login_events where created_at < now() - interval '90 days';
end;
$$;

revoke all on function yunikov_v1.cleanup_expired_data() from public;
grant execute on function yunikov_v1.cleanup_expired_data() to service_role;
