-- Migracja: Zgłoszenia do ekipy moderacji (Discord, Facebook, Obie platformy)

create table if not exists public.staff_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  platform text not null check (platform in ('discord', 'facebook', 'both')),
  applicant_name text not null,
  age integer check (age is null or (age >= 13 and age <= 99)),
  discord_tag text not null,
  facebook_url text,
  albion_nick text,
  server text not null default 'Europa',
  experience text not null,
  availability text not null,
  motivation text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint staff_applications_name_length check (char_length(btrim(applicant_name)) between 2 and 60),
  constraint staff_applications_experience_length check (char_length(btrim(experience)) between 10 and 2000),
  constraint staff_applications_availability_length check (char_length(btrim(availability)) between 5 and 1000),
  constraint staff_applications_motivation_length check (char_length(btrim(motivation)) between 10 and 2000)
);

create index if not exists staff_applications_status_created_idx
  on public.staff_applications (status, created_at desc);

create index if not exists staff_applications_user_id_idx
  on public.staff_applications (user_id);

alter table public.staff_applications enable row level security;

-- Odczyt własnych zgłoszeń przez zalogowanego użytkownika
drop policy if exists "Members read own staff applications" on public.staff_applications;
create policy "Members read own staff applications"
  on public.staff_applications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Składanie zgłoszeń przez zalogowanych użytkowników
drop policy if exists "Members insert staff applications" on public.staff_applications;
create policy "Members insert staff applications"
  on public.staff_applications
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and admin_notes is null
  );

-- Personel (moderator i admin) ma pełny odczyt i aktualizację
drop policy if exists "Staff read all staff applications" on public.staff_applications;
create policy "Staff read all staff applications"
  on public.staff_applications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
      and profiles.role in ('moderator', 'admin')
    )
  );

drop policy if exists "Staff update staff applications" on public.staff_applications;
create policy "Staff update staff applications"
  on public.staff_applications
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
      and profiles.role in ('moderator', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
      and profiles.role in ('moderator', 'admin')
    )
  );
