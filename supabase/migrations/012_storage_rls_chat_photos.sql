-- Enable RLS on storage.objects (already enabled by default in Supabase)
do $body$ begin
  create policy "chat_photos_insert" on storage.objects for insert to authenticated with check ( bucket_id = 'chat-photos' );
exception when duplicate_object then null;
end $body$;
do $body$ begin
  create policy "chat_photos_select" on storage.objects for select to authenticated using ( bucket_id = 'chat-photos' );
exception when duplicate_object then null;
end $body$;
do $body$ begin
  create policy "chat_photos_select_public" on storage.objects for select to public using ( bucket_id = 'chat-photos' );
exception when duplicate_object then null;
end $body$;
do $body$ begin
  create policy "chat_photos_update_own" on storage.objects for update to authenticated using ( bucket_id = 'chat-photos' and owner = auth.uid() );
exception when duplicate_object then null;
end $body$;
do $body$ begin
  create policy "chat_photos_delete_own" on storage.objects for delete to authenticated using ( bucket_id = 'chat-photos' and owner = auth.uid() );
exception when duplicate_object then null;
end $body$;