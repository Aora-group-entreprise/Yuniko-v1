-- Block: security, settings, event persistence, and atomic interactions.
create table if not exists yunikov_v1.user_settings (
  user_id uuid primary key references yunikov_v1.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table yunikov_v1.user_settings enable row level security;
drop policy if exists user_settings_select_self on yunikov_v1.user_settings;
create policy user_settings_select_self on yunikov_v1.user_settings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_settings_insert_self on yunikov_v1.user_settings;
create policy user_settings_insert_self on yunikov_v1.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_settings_update_self on yunikov_v1.user_settings;
create policy user_settings_update_self on yunikov_v1.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on yunikov_v1.user_settings to authenticated;

alter table yunikov_v1.events add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function yunikov_v1.toggle_like_atomic(p_post_id uuid, p_liked boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_user_id uuid := yunikov_v1.app_current_user_id(); v_exists boolean;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select exists(select 1 from yunikov_v1.likes where user_id=v_user_id and post_id=p_post_id) into v_exists;
  if p_liked and not v_exists then
    insert into yunikov_v1.likes(user_id,post_id) values(v_user_id,p_post_id);
    insert into yunikov_v1.events(user_id,post_id,type,weight) values(v_user_id,p_post_id,'like.created'::yunikov_v1.event_type,1);
  elsif not p_liked and v_exists then
    delete from yunikov_v1.likes where user_id=v_user_id and post_id=p_post_id;
    insert into yunikov_v1.events(user_id,post_id,type,weight) values(v_user_id,p_post_id,'like.removed'::yunikov_v1.event_type,1);
  end if;
  return p_liked;
end;
$$;
revoke all on function yunikov_v1.toggle_like_atomic(uuid,boolean) from public;
grant execute on function yunikov_v1.toggle_like_atomic(uuid,boolean) to authenticated;

create or replace function yunikov_v1.create_comment_atomic(p_post_id uuid,p_parent_id uuid,p_body text)
returns yunikov_v1.comments language plpgsql security invoker set search_path='' as $$
declare v_user_id uuid := yunikov_v1.app_current_user_id(); v_comment yunikov_v1.comments;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_body is null or length(trim(p_body))=0 or length(p_body)>1000 then raise exception 'Invalid comment body'; end if;
  insert into yunikov_v1.comments(post_id,author_id,parent_id,body) values(p_post_id,v_user_id,p_parent_id,trim(p_body)) returning * into v_comment;
  insert into yunikov_v1.events(user_id,post_id,type,weight,metadata) values(v_user_id,p_post_id,'comment.created'::yunikov_v1.event_type,3,jsonb_build_object('comment_id',v_comment.id,'parent_id',p_parent_id));
  return v_comment;
end;
$$;
revoke all on function yunikov_v1.create_comment_atomic(uuid,uuid,text) from public;
grant execute on function yunikov_v1.create_comment_atomic(uuid,uuid,text) to authenticated;

create table if not exists yunikov_v1.login_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references yunikov_v1.users(id) on delete cascade,
 success boolean not null, device_label text not null default 'This device', country_code varchar(2), created_at timestamptz not null default now()
);
alter table yunikov_v1.login_events enable row level security;
drop policy if exists login_events_select_self on yunikov_v1.login_events;
create policy login_events_select_self on yunikov_v1.login_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists login_events_insert_self on yunikov_v1.login_events;
create policy login_events_insert_self on yunikov_v1.login_events for insert to authenticated with check ((select auth.uid()) = user_id);
grant select, insert on yunikov_v1.login_events to authenticated;
