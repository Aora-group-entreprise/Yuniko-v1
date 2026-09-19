-- Phase 3: complete notification side effects for follows, saves, shares and messages.

create or replace function yunikov_v1.notify_follow()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'accepted' then
      perform yunikov_v1.create_notification(new.following_id, new.follower_id, 'follow', 'user', new.following_id, 'follow:' || new.follower_id::text);
    elsif new.status = 'pending' then
      perform yunikov_v1.create_notification(new.following_id, new.follower_id, 'follow_request', 'user', new.following_id, 'follow_request:' || new.follower_id::text);
    end if;
  elsif tg_op = 'UPDATE' and old.status <> new.status and new.status = 'accepted' then
    perform yunikov_v1.create_notification(new.following_id, new.follower_id, 'follow', 'user', new.following_id, 'follow:' || new.follower_id::text);
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
    if owner_id is not null and owner_id <> new.user_id then
      perform yunikov_v1.create_notification(owner_id, new.user_id, 'save', 'post', new.post_id, 'save:' || new.post_id::text);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_notify_post_save on yunikov_v1.saves;
create trigger trg_notify_post_save after insert on yunikov_v1.saves
for each row execute function yunikov_v1.notify_post_save();

create or replace function yunikov_v1.notify_post_share()
returns trigger language plpgsql set search_path = '' as $$
declare owner_id uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into owner_id from yunikov_v1.posts where id = new.post_id;
    if owner_id is not null and owner_id <> new.user_id then
      perform yunikov_v1.create_notification(owner_id, new.user_id, 'share', 'post', new.post_id, 'share:' || new.post_id::text);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_notify_post_share on yunikov_v1.shares;
create trigger trg_notify_post_share after insert on yunikov_v1.shares
for each row execute function yunikov_v1.notify_post_share();

create or replace function yunikov_v1.notify_message()
returns trigger language plpgsql set search_path = '' as $$
declare member record;
begin
  if tg_op = 'INSERT' and new.deleted_at is null then
    for member in
      select user_id from yunikov_v1.conversation_members
      where conversation_id = new.conversation_id and user_id <> new.sender_id and is_archived = false
    loop
      perform yunikov_v1.create_notification(member.user_id, new.sender_id, 'message', 'message', new.id, 'message:' || new.conversation_id::text);
    end loop;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_notify_message on yunikov_v1.messages;
create trigger trg_notify_message after insert on yunikov_v1.messages
for each row execute function yunikov_v1.notify_message();
