-- Migration 007: Notifications

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index notifications_user_idx on notifications(user_id);
create index notifications_user_unread_idx on notifications(user_id) where read_at is null;

alter table notifications enable row level security;
