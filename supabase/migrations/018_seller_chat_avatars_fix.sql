-- Seller-to-seller messaging + chat file storage

create table if not exists public.seller_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  attachment_url text,
  attachment_name text,
  attachment_mime text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id),
  check (body is not null or attachment_url is not null)
);

create index if not exists seller_messages_pair_idx
  on public.seller_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

create or replace function public.can_use_seller_chat()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_principal_admin()
    or exists (
      select 1 from public.sellers s
      where s.profile_id = auth.uid() and s.status = 'approved'
    );
$$;

create or replace function public.is_chat_eligible(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id
      and (
        p.role in ('admin', 'co_admin')
        or exists (
          select 1 from public.sellers s
          where s.profile_id = p.id and s.status = 'approved'
        )
      )
  );
$$;

alter table public.seller_messages enable row level security;

drop policy if exists "seller chat read" on public.seller_messages;
create policy "seller chat read" on public.seller_messages
for select using (
  public.can_use_seller_chat()
  and (sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "seller chat insert" on public.seller_messages;
create policy "seller chat insert" on public.seller_messages
for insert with check (
  sender_id = auth.uid()
  and public.can_use_seller_chat()
  and public.is_chat_eligible(recipient_id)
);

drop policy if exists "seller chat mark read" on public.seller_messages;
create policy "seller chat mark read" on public.seller_messages
for update using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('seller-chat-files', 'seller-chat-files', true)
on conflict (id) do nothing;

drop policy if exists "public read seller chat files" on storage.objects;
create policy "public read seller chat files"
on storage.objects for select using (bucket_id = 'seller-chat-files');

drop policy if exists "seller chat upload" on storage.objects;
create policy "seller chat upload"
on storage.objects for insert
with check (
  bucket_id = 'seller-chat-files'
  and public.can_use_seller_chat()
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Fix avatar storage paths (gallery upload on mobile)
drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

grant execute on function public.can_use_seller_chat() to authenticated;
grant execute on function public.is_chat_eligible(uuid) to authenticated;
