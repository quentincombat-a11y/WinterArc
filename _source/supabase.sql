-- Winter Arc : table unique, chaque utilisateur ne voit que ses propres documents.
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  coll text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, id)
);
alter table public.docs enable row level security;
drop policy if exists "chacun ses documents" on public.docs;
create policy "chacun ses documents" on public.docs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
