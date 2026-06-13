# Nova Setup

## Supabase

Run this SQL in the Supabase SQL editor to create the tables used by the Library tab:

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
  source         text not null check (source in ('notion', 'apple')),
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

create table if not exists library_integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  service        text not null check (service in ('notion')),
  api_key        text not null,
  workspace_name text,
  last_synced_at timestamptz,
  created_at     timestamptz default now()
);
alter table library_integrations enable row level security;
create policy "anon_all_library_integrations" on library_integrations for all to anon using (true) with check (true);
```

---

## Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**, name it "Nova", submit
3. Copy the **Internal Integration Token** — it starts with `secret_`
4. In each Notion page you want synced: click **···** → **Add connections** → select **Nova**
5. Open Nova → Library tab → **Connect Notion** → paste the token

The sync runs automatically on page load if it has been more than 1 hour since the last sync. Tap the refresh icon (↻) to sync manually at any time.

> Note: The Notion API token is stored in your Supabase database and is never hardcoded in the app. Syncing runs through a Vercel serverless function (`/api/notion-sync`) so the token is never exposed in browser network requests to the Notion API.

---

## Apple Notes Upload

1. Open Nova → Library tab
2. Tap **+ Upload notes** in the Apple Notes section
3. Select `.txt` or `.pdf` files from your device
4. The note content is extracted and stored in Supabase

For Apple Notes specifically: export from Apple Notes as PDF (File → Export as PDF) or copy-paste into a .txt file.
