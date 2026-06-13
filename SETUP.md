# Nova Setup

## Supabase

### Step 1 — Create tables

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  title       text not null,
  description text,
  deadline    date,
  status      text default 'active' check (status in ('active', 'completed', 'archived')),
  created_at  timestamptz default now()
);
alter table goals enable row level security;
create policy "anon_all_goals" on goals for all to anon using (true) with check (true);

create table if not exists library_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  source         text not null check (source in ('native')),
  title          text not null,
  body           text,
  external_id    text,
  external_url   text,
  last_synced_at timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table library_notes enable row level security;
create policy "anon_all_library_notes" on library_notes for all to anon using (true) with check (true);
```

### Step 2 — If the table already exists (migration)

If `library_notes` was created in a prior session with `source in ('notion', 'apple')`, update the constraint:

```sql
alter table library_notes
  drop constraint library_notes_source_check;

alter table library_notes
  add constraint library_notes_source_check
  check (source in ('notion', 'apple', 'native'));
```
