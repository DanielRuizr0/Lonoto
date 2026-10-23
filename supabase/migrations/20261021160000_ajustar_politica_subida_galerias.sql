drop policy if exists "Upload private order gallery images" on storage.objects;
drop policy if exists "Restrict private order gallery uploads" on storage.objects;

create policy "Upload private order gallery images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'galerias_pedidos'
  and cardinality(storage.foldername(name)) = 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp)$'
);
