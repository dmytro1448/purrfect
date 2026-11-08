create extension if not exists pgcrypto;

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Ми',
  started_at date,
  tz text not null default 'Europe/Riga',
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  cat jsonb not null default '{}'::jsonb,
  activity_days text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists members (
  tg_id bigint primary key,
  couple_id uuid references couples(id) on delete set null,
  name text not null default '',
  username text,
  avatar_url text,
  color text not null default 'pink',
  joined_at timestamptz not null default now()
);
create index if not exists members_couple on members(couple_id);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  done boolean not null default false,
  created_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_couple_kind on items(couple_id, kind);

create table if not exists sent_log (
  key text primary key,
  sent_at timestamptz not null default now()
);

-- Доступ лише через edge functions (service role). Анонімам — нічого.
alter table couples enable row level security;
alter table members enable row level security;
alter table items enable row level security;
alter table sent_log enable row level security;

-- Сховище фото: публічне читання за випадковим шляхом, запис лише через signed upload
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

alter table couples add column if not exists meta jsonb not null default '{}'::jsonb;
