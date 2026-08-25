-- Seller chat peer list (no ambiguous profiles embed) + chatbot file uploads

create or replace function public.list_seller_chat_peers()
returns table (
  profile_id uuid,
  shop_name text,
  full_name text,
  email text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.profile_id,
    s.shop_name,
    p.full_name,
    p.email,
    p.avatar_url
  from public.sellers s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
    and s.profile_id is distinct from auth.uid()
    and public.can_use_seller_chat()
  order by s.shop_name;
$$;

grant execute on function public.list_seller_chat_peers() to authenticated;

insert into storage.buckets (id, name, public)
values ('chatbot-files', 'chatbot-files', true)
on conflict (id) do nothing;

drop policy if exists "public read chatbot files" on storage.objects;
create policy "public read chatbot files"
on storage.objects for select using (bucket_id = 'chatbot-files');

drop policy if exists "chatbot upload files" on storage.objects;
create policy "chatbot upload files"
on storage.objects for insert
with check (
  bucket_id = 'chatbot-files'
  and (
    (auth.uid() is not null and split_part(name, '/', 1) = auth.uid()::text)
    or split_part(name, '/', 1) like 'guest-%'
  )
);
