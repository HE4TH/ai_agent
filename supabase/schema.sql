-- 레이어 1: 기본 예약 시스템 스키마
-- Users, Resources, Reservations + 동시 예약 방지 제약

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- exclude constraint에서 uuid(=) 조건 사용
create extension if not exists "vector";     -- pgvector, 임베딩 유사도 검색

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

-- 문서 청크 (RAG용 임베딩 저장)
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- HNSW: ivfflat과 달리 클러스터 학습에 필요한 최소 데이터량 제약이 없어
-- 문서가 수십~수백 개인 초기 단계에서도 바로 정확한 인덱스를 구성할 수 있음
create index if not exists idx_document_chunks_embedding
  on document_chunks
  using hnsw (embedding vector_cosine_ops);

-- query_embedding과 코사인 유사도가 가장 높은 순으로 상위 match_count개의 청크 반환
create or replace function match_documents (
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
