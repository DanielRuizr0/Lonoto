create table if not exists public.pedido_galerias (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  pedido jsonb not null check (jsonb_typeof(pedido) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

alter table public.pedido_galerias enable row level security;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'galerias_pedidos',
  'galerias_pedidos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Upload private order gallery images" on storage.objects;
create policy "Upload private order gallery images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'galerias_pedidos'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Restrict private order gallery uploads" on storage.objects;
create policy "Restrict private order gallery uploads"
on storage.objects
as restrictive
for insert
to anon, authenticated
with check (
  bucket_id = 'galerias_pedidos'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Restrict private order gallery reads" on storage.objects;
create policy "Restrict private order gallery reads"
on storage.objects
as restrictive
for select
to anon, authenticated
using (bucket_id <> 'galerias_pedidos');

drop policy if exists "Restrict private order gallery updates" on storage.objects;
create policy "Restrict private order gallery updates"
on storage.objects
as restrictive
for update
to anon, authenticated
using (bucket_id <> 'galerias_pedidos')
with check (bucket_id <> 'galerias_pedidos');

drop policy if exists "Restrict private order gallery deletes" on storage.objects;
create policy "Restrict private order gallery deletes"
on storage.objects
as restrictive
for delete
to anon, authenticated
using (bucket_id <> 'galerias_pedidos');
