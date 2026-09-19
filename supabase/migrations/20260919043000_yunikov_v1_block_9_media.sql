-- Yuniko block 9: production media storage.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
('post-media','post-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
('story-media','story-media',true,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "post_media_insert_own" on storage.objects;
create policy "post_media_insert_own" on storage.objects for insert to authenticated with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "post_media_update_own" on storage.objects;
create policy "post_media_update_own" on storage.objects for update to authenticated using (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "post_media_delete_own" on storage.objects;
create policy "post_media_delete_own" on storage.objects for delete to authenticated using (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "post_media_public_read" on storage.objects;
create policy "post_media_public_read" on storage.objects for select to public using (bucket_id='post-media');
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select to public using (bucket_id='avatars');

create or replace function yunikov_v1.validate_media_metadata(p_mime text,p_size bigint,p_max_size bigint)
returns boolean language sql immutable set search_path='' as 'select p_mime is not null and p_size > 0 and p_size <= p_max_size';
revoke all on function yunikov_v1.validate_media_metadata(text,bigint,bigint) from public,anon;
grant execute on function yunikov_v1.validate_media_metadata(text,bigint,bigint) to authenticated;