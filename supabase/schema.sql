-- 레이어 1: 기본 예약 시스템 스키마
-- Users, Resources, Reservations + 동시 예약 방지 제약

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- exclude constraint에서 uuid(=) 조건 사용

-- 사용자
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text,          -- NextAuth Credentials 사용 시 필요, OAuth만 쓸 경우 null 허용
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 예약 가능 자원 (회의실, 장비 등)
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,           -- 예: 'room', 'equipment'
  capacity integer,
  location text,
  created_at timestamptz not null default now()
);

-- 예약
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),

  constraint reservations_time_valid check (end_time > start_time),

  -- 1) 같은 자원에 대해 동일 시작 시각의 중복 예약(동시 요청 race condition) 차단
  --    취소된 예약은 제외하고 확정된 예약끼리만 유일해야 함
  constraint reservations_no_duplicate_start
    unique (resource_id, start_time)

  -- 2) 시작 시각이 달라도 시간대가 겹치는 예약까지 막으려면 아래 EXCLUDE 제약이 필요.
  --    (예: 10:00-11:00 예약이 있는데 10:30-11:30 예약이 들어오는 경우는 위 UNIQUE로는 못 막음)
  --    운영 정책상 자원 예약을 "겹침 없이" 운영한다면 이 줄의 주석을 해제해서 사용.
  exclude using gist (
    resource_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status = 'confirmed')
);

create index if not exists idx_reservations_resource_time
  on reservations (resource_id, start_time);

create index if not exists idx_reservations_user
  on reservations (user_id);
