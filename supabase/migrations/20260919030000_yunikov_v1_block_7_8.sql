-- Yuniko blocks 7 and 8: moderation/security + realtime.
-- Canonical schema: yunikov_v1.

create table if not exists yunikov_v1.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references yunikov_v1.reports(id) on delete set null,
  entity_type varchar(32) not null,
  entity_id uuid not null,
  action varchar(32) not null check (action in ('review','limit','hide','remove','restore','warn','suspend','unsuspend')),
  reason varchar(1000),
  actor_id uuid references yunikov_v1.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists yunikov_v1.user_rate_limits (
  user_id uuid not null references yunikov_v1.users(id) on delete cascade,
  scope varchar(64) not null,
  window_started_at timestamptz not null default now(),
  used integer not null default 0 check (used >= 0),
  primary key (user_id, scope)
);
alter table yunikov_v1.moderation_actions enable row level security;
alter table yunikov_v1.user_rate_limits enable row level security;
alter table yunikov_v1.reports enable row level security;
alter table yunikov_v1.blocks enable row level security;
drop policy if exists moderation_actions_none on yunikov_v1.moderation_actions;
create policy moderation_actions_none on yunikov_v1.moderation_actions for all to authenticated using (false) with check (false);
drop policy if exists rate_limits_none on yunikov_v1.user_rate_limits;
create policy rate_limits_none on yunikov_v1.user_rate_limits for all to authenticated using (false) with check (false);
drop policy if exists reports_insert_own on yunikov_v1.reports;
create policy reports_insert_own on yunikov_v1.reports for insert to authenticated with check (reporter_id=(select auth.uid()));
drop policy if exists reports_select_own on yunikov_v1.reports;
create policy reports_select_own on yunikov_v1.reports for select to authenticated using (reporter_id=(select auth.uid()));
drop policy if exists blocks_select_own on yunikov_v1.blocks;
create policy blocks_select_own on yunikov_v1.blocks for select to authenticated using (blocker_id=(select auth.uid()));
drop policy if exists blocks_insert_own on yunikov_v1.blocks;
create policy blocks_insert_own on yunikov_v1.blocks for insert to authenticated with check (blocker_id=(select auth.uid()) and blocked_id<>(select auth.uid()));
drop policy if exists blocks_delete_own on yunikov_v1.blocks;
create policy blocks_delete_own on yunikov_v1.blocks for delete to authenticated using (blocker_id=(select auth.uid()));
create index if not exists reports_entity_status_idx on yunikov_v1.reports(entity_type,entity_id,status,created_at desc);
create index if not exists moderation_actions_entity_idx on yunikov_v1.moderation_actions(entity_type,entity_id,created_at desc);
create unique index if not exists reports_dedupe_idx on yunikov_v1.reports(reporter_id,entity_type,entity_id,reason);

create or replace function yunikov_v1.consume_rate_limit(p_scope text,p_limit integer,p_window_seconds integer default 60)
returns boolean language plpgsql security invoker set search_path='' as $$
declare uid uuid:=(select auth.uid()); now_ts timestamptz:=clock_timestamp(); current_used integer;
begin
 if uid is null or p_scope is null or p_scope='' or p_limit<1 or p_window_seconds<1 then return false; end if;
 insert into yunikov_v1.user_rate_limits(user_id,scope,window_started_at,used)
 values(uid,left(p_scope,64),now_ts,1)
 on conflict(user_id,scope) do update set
 window_started_at=case when yunikov_v1.user_rate_limits.window_started_at<=now_ts-make_interval(secs=>p_window_seconds) then excluded.window_started_at else yunikov_v1.user_rate_limits.window_started_at end,
 used=case when yunikov_v1.user_rate_limits.window_started_at<=now_ts-make_interval(secs=>p_window_seconds) then 1 else yunikov_v1.user_rate_limits.used+1 end
 returning used into current_used;
 return current_used<=p_limit;
end $$;
revoke all on function yunikov_v1.consume_rate_limit(text,integer,integer) from public,anon;
grant execute on function yunikov_v1.consume_rate_limit(text,integer,integer) to authenticated;

create or replace function yunikov_v1.notify_realtime()
returns trigger language plpgsql security invoker set search_path='' as $$
declare entity_id uuid; scope_name text; kind_name text;
begin
 entity_id:=coalesce(new.id,old.id);
 if tg_table_name='notifications' then scope_name:='user:'||new.recipient_id::text; kind_name:='notification';
 elsif tg_table_name='messages' then scope_name:='conversation:'||new.conversation_id::text; kind_name:='message';
 elsif tg_table_name='stories' then scope_name:='stories'; kind_name:='story';
 elsif tg_table_name='posts' then scope_name:='feed'; kind_name:='post';
 else scope_name:='interactions'; kind_name:=tg_table_name; end if;
 perform pg_notify('yuniko_realtime',json_build_object('id',entity_id::text||':'||tg_op||':'||floor(extract(epoch from clock_timestamp())*1000)::bigint::text,'scope',scope_name,'kind',kind_name,'entity_id',entity_id,'event',tg_op)::text);
 return coalesce(new,old);
end $$;

drop trigger if exists trg_realtime_posts on yunikov_v1.posts;
create trigger trg_realtime_posts after insert or update or delete on yunikov_v1.posts for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_notifications on yunikov_v1.notifications;
create trigger trg_realtime_notifications after insert or update or delete on yunikov_v1.notifications for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_messages on yunikov_v1.messages;
create trigger trg_realtime_messages after insert or update or delete on yunikov_v1.messages for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_stories on yunikov_v1.stories;
create trigger trg_realtime_stories after insert or update or delete on yunikov_v1.stories for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_likes on yunikov_v1.likes;
create trigger trg_realtime_likes after insert or delete on yunikov_v1.likes for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_comments on yunikov_v1.comments;
create trigger trg_realtime_comments after insert or update or delete on yunikov_v1.comments for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_saves on yunikov_v1.saves;
create trigger trg_realtime_saves after insert or delete on yunikov_v1.saves for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_shares on yunikov_v1.shares;
create trigger trg_realtime_shares after insert on yunikov_v1.shares for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_follows on yunikov_v1.follows;
create trigger trg_realtime_follows after insert or update or delete on yunikov_v1.follows for each row execute function yunikov_v1.notify_realtime();
drop trigger if exists trg_realtime_blocks on yunikov_v1.blocks;
create trigger trg_realtime_blocks after insert or delete on yunikov_v1.blocks for each row execute function yunikov_v1.notify_realtime();

-- Enable Supabase Postgres Changes for all block-8 interaction streams.
alter publication supabase_realtime add table yunikov_v1.posts;
alter publication supabase_realtime add table yunikov_v1.notifications;
alter publication supabase_realtime add table yunikov_v1.messages;
alter publication supabase_realtime add table yunikov_v1.stories;
alter publication supabase_realtime add table yunikov_v1.likes;
alter publication supabase_realtime add table yunikov_v1.comments;
alter publication supabase_realtime add table yunikov_v1.saves;
alter publication supabase_realtime add table yunikov_v1.shares;
alter publication supabase_realtime add table yunikov_v1.follows;
alter publication supabase_realtime add table yunikov_v1.blocks;
