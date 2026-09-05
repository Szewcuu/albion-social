create table if not exists public.build_weekly_votes (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  build_id uuid not null references public.builds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint build_weekly_votes_one_per_week unique (week_start, user_id),
  constraint build_weekly_votes_monday check (extract(isodow from week_start) = 1)
);

create index if not exists build_weekly_votes_week_build_idx
  on public.build_weekly_votes (week_start, build_id);

create index if not exists build_weekly_votes_user_week_idx
  on public.build_weekly_votes (user_id, week_start desc);

alter table public.build_weekly_votes enable row level security;

drop policy if exists "Authenticated users can read weekly build votes" on public.build_weekly_votes;
create policy "Authenticated users can read weekly build votes"
  on public.build_weekly_votes
  for select
  to authenticated
  using (true);

drop policy if exists "Users can cast their current weekly build vote" on public.build_weekly_votes;
create policy "Users can cast their current weekly build vote"
  on public.build_weekly_votes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and week_start = (
      timezone('utc', now())::date
      - (extract(isodow from timezone('utc', now()))::integer - 1)
    )
  );

drop policy if exists "Users can change their current weekly build vote" on public.build_weekly_votes;
create policy "Users can change their current weekly build vote"
  on public.build_weekly_votes
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and week_start = (
      timezone('utc', now())::date
      - (extract(isodow from timezone('utc', now()))::integer - 1)
    )
  );

drop policy if exists "Users can withdraw their current weekly build vote" on public.build_weekly_votes;
create policy "Users can withdraw their current weekly build vote"
  on public.build_weekly_votes
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and week_start = (
      timezone('utc', now())::date
      - (extract(isodow from timezone('utc', now()))::integer - 1)
    )
  );

revoke all on table public.build_weekly_votes from anon, authenticated;
grant select, insert, update, delete on table public.build_weekly_votes to authenticated;
grant all on table public.build_weekly_votes to service_role;
