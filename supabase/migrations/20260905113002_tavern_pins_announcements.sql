alter table public.chat_messages
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles(id) on delete set null;

alter table public.chat_messages
  drop constraint if exists chat_messages_pinned_state_check;

alter table public.chat_messages
  add constraint chat_messages_pinned_state_check check (
    (is_pinned = false and pinned_at is null and pinned_by is null)
    or (is_pinned = true and pinned_at is not null)
  );

create index if not exists chat_messages_pinned_idx
  on public.chat_messages (pinned_at desc, id desc)
  where is_pinned = true and status = 'visible' and channel = 'GLOBALNY';

create index if not exists chat_messages_pinned_by_idx
  on public.chat_messages (pinned_by)
  where pinned_by is not null;

alter policy "Publish own visible chat" on public.chat_messages
  with check (
    (select auth.uid()) = user_id
    and status = 'visible'
    and channel = 'GLOBALNY'
    and char_length(btrim(text)) between 1 and 500
    and is_pinned = false
    and pinned_at is null
    and pinned_by is null
  );

create table if not exists public.tavern_announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'info',
  status text not null default 'visible',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tavern_announcements_title_check check (char_length(btrim(title)) between 3 and 80),
  constraint tavern_announcements_body_check check (char_length(btrim(body)) between 3 and 280),
  constraint tavern_announcements_kind_check check (kind in ('info', 'event', 'maintenance')),
  constraint tavern_announcements_status_check check (status in ('visible', 'archived')),
  constraint tavern_announcements_expiry_check check (expires_at is null or expires_at > created_at)
);

create index if not exists tavern_announcements_active_idx
  on public.tavern_announcements (created_at desc, id desc)
  where status = 'visible';

create index if not exists tavern_announcements_author_idx
  on public.tavern_announcements (author_id);

alter table public.tavern_announcements enable row level security;

drop policy if exists "Members read active tavern announcements" on public.tavern_announcements;
create policy "Members read active tavern announcements"
  on public.tavern_announcements
  for select
  to authenticated
  using (
    (status = 'visible' and (expires_at is null or expires_at > timezone('utc', now())))
    or (select public.is_portal_staff())
  );

drop policy if exists "Staff publish tavern announcements" on public.tavern_announcements;
create policy "Staff publish tavern announcements"
  on public.tavern_announcements
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and (select public.is_portal_staff())
    and status = 'visible'
  );

drop policy if exists "Staff update tavern announcements" on public.tavern_announcements;
create policy "Staff update tavern announcements"
  on public.tavern_announcements
  for update
  to authenticated
  using ((select public.is_portal_staff()))
  with check ((select public.is_portal_staff()));

revoke all on table public.tavern_announcements from anon, authenticated;
grant select, insert, update on table public.tavern_announcements to authenticated;
grant all on table public.tavern_announcements to service_role;
