create table if not exists yunikov_v1._yuniko_migration_marker (id text primary key);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('story-media','story-media',true,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public=true,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "story_media_public_read" on storage.objects;
create policy "story_media_public_read" on storage.objects for select to public
using (bucket_id='story-media');

drop policy if exists "story_media_insert_own" on storage.objects;
create policy "story_media_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='story-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "story_media_update_own" on storage.objects;
create policy "story_media_update_own" on storage.objects for update to authenticated
using (bucket_id='story-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='story-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "story_media_delete_own" on storage.objects;
create policy "story_media_delete_own" on storage.objects for delete to authenticated
using (bucket_id='story-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

alter table yunikov_v1.stories enable row level security;
drop policy if exists stories_select_active on yunikov_v1.stories;
create policy stories_select_active on yunikov_v1.stories for select to authenticated
using (expires_at > now() and (visibility = 'public' or author_id = (select auth.uid())));
drop policy if exists stories_insert_own on yunikov_v1.stories;
create policy stories_insert_own on yunikov_v1.stories for insert to authenticated
with check (author_id = (select auth.uid()));
