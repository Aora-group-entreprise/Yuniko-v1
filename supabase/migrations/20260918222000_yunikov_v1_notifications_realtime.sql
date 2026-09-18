-- Phase 5-6: notification fan-out and canonical Realtime publication.

drop function if exists yunikov_v1.create_notification(uuid,uuid,character varying,character varying,uuid,character varying);

create or replace function yunikov_v1.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_group_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient_id is null or p_type is null then return; end if;
  if p_actor_id is not null and p_actor_id = p_recipient_id then return; end if;

  insert into yunikov_v1.notifications(
    recipient_id, actor_id, type, entity_type, entity_id, group_key, count, is_read
  )
  values (
    p_recipient_id, p_actor_id, left(trim(p_type), 40), left(trim(p_entity_type), 40),
    p_entity_id, left(trim(p_group_key), 160), 1, false
  )
  on conflict (recipient_id, group_key) where group_key is not null
  do update set actor_id=excluded.actor_id, type=excluded.type, entity_type=excluded.entity_type,
                entity_id=excluded.entity_id, count=yunikov_v1.notifications.count+1,
                is_read=false, created_at=now();
end;
$$;

revoke all on function yunikov_v1.create_notification(uuid,uuid,text,text,uuid,text)
from public, anon, authenticated;

create unique index if not exists notifications_group_key_unique_idx
on yunikov_v1.notifications(recipient_id, group_key)
where group_key is not null;

create or replace function yunikov_v1.notify_follow()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.status = 'accepted')
     or (tg_op = 'UPDATE' and old.status <> 'accepted' and new.status = 'accepted') then
    perform yunikov_v1.create_notification(
      new.following_id, new.follower_id, 'follow', 'user',
      new.following_id, 'follow:' || new.following_id::text
    );
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function yunikov_v1.notify_post_save()
returns trigger language plpgsql set search_path = '' as $$
declare owner_id uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into owner_id from yunikov_v1.posts where id = new.post_id;
    perform yunikov_v1.create_notification(
      owner_id, new.user_id, 'save', 'post', new.post_id, 'save:' || new.post_id::text
    );
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function yunikov_v1.notify_post_share()
returns trigger language plpgsql set search_path = '' as $$
declare owner_id uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into owner_id from yunikov_v1.posts where id = new.post_id;
    perform yunikov_v1.create_notification(
      owner_id, new.user_id, 'share', 'post', new.post_id, 'share:' || new.post_id::text
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_notify_follow on yunikov_v1.follows;
create trigger trg_notify_follow
after insert or update on yunikov_v1.follows
for each row execute function yunikov_v1.notify_follow();

drop trigger if exists trg_notify_post_save on yunikov_v1.saves;
create trigger trg_notify_post_save
after insert on yunikov_v1.saves
for each row execute function yunikov_v1.notify_post_save();

drop trigger if exists trg_notify_post_share on yunikov_v1.shares;
create trigger trg_notify_post_share
after insert on yunikov_v1.shares
for each row execute function yunikov_v1.notify_post_share();

alter table yunikov_v1.notifications enable row level security;

drop policy if exists notifications_recipient on yunikov_v1.notifications;
create policy notifications_recipient on yunikov_v1.notifications
for select to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists notifications_update on yunikov_v1.notifications;
create policy notifications_update on yunikov_v1.notifications
for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create index if not exists notifications_recipient_created_idx
on yunikov_v1.notifications(recipient_id, created_at desc);

alter publication supabase_realtime add table yunikov_v1.posts;
alter publication supabase_realtime add table yunikov_v1.notifications;
alter publication supabase_realtime add table yunikov_v1.messages;
alter publication supabase_realtime add table yunikov_v1.follows;
alter publication supabase_realtime add table yunikov_v1.stories;


create or replace function yunikov_v1.notify_message()
returns trigger language plpgsql set search_path = ''
as $$
declare recipient uuid;
begin
  for recipient in
    select user_id from yunikov_v1.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform yunikov_v1.create_notification(
      recipient,new.sender_id,'message','conversation',new.conversation_id,
      'message:' || new.conversation_id::text
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_message on yunikov_v1.messages;
create trigger trg_notify_message
after insert on yunikov_v1.messages
for each row execute function yunikov_v1.notify_message();
