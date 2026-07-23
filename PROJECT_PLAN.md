# AI 라우팅 기반 스마트 예약 시스템

## 한 줄 정의
자연어로 예약·질문이 가능한 예약 관리 서비스. 요청 종류에 따라 저가 모델(라우터)과 고성능 모델(전문 에이전트)을 분리해서 비용과 응답 품질을 동시에 잡은 구조.

## 목표
- React/TypeScript, Node.js, PostgreSQL, RAG, LLM 함수 호출/에이전트 워크플로우 등 아직 다뤄보지 않은 기술을 실제로 사용해보고 학습
- 지원 예정 기업(인티그레이션, 밸류앤플러스, 제네시스네스트) 요구 기술 스택과 겹치는 포트폴리오 제작

---

## 대상 기업 및 요구 기술 정리

### 1. 인티그레이션(메디스트림) — [AX] 인턴 백엔드 개발자
- 주요업무: AI 프로덕트 백엔드 설계, Node.js/TypeScript 기반 AI Agent 백엔드, LLM API 호출 게이트웨이(재시도/타임아웃/캐싱), RAG·함수 호출·에이전트 워크플로우, PostgreSQL 데이터 모델링
- 요구 기술: Node.js, TypeScript, PostgreSQL, React 또는 Vue, Git, LLM API 연동/프롬프트 엔지니어링

### 2. 제네시스네스트 — Java 백엔드 개발자
- 주요업무: Spring 기반 Back-End 개발
- 요구 기술: Java, Spring, Git, SQL, Linux

### 3. 밸류앤플러스 — 풀스택 개발자
- 주요업무: 콘텐츠 자동화 플랫폼, 검색 데이터 수집/순위 모니터링, Admin 시스템
- 요구 기술: Java 또는 Python, React, REST API, MySQL/PostgreSQL, Git, AWS, AI 도구(ChatGPT, Claude 등) 활용 경험

### 공통 기술
- Git, SQL/PostgreSQL — 3사 전부
- React — 인티그레이션, 밸류앤플러스
- AI 도구/LLM 활용 경험 — 인티그레이션(핵심 업무), 밸류앤플러스(우대 요건)

---

## 확정 기술 스택

| 계층 | 기술 | 역할 |
|---|---|---|
| 프레임워크 | Next.js | React(프론트)와 API Routes(백엔드)를 한 프로젝트에서 처리 |
| 언어 | TypeScript | 프론트-백엔드 타입 공유, 함수 호출 스키마 안정성 확보 |
| 런타임 | Node.js | Next.js API Routes가 실행되는 환경 (인티그레이션 요구 스택) |
| DB | Supabase (PostgreSQL + pgvector) | 예약 데이터 저장 + 문서 벡터 검색(RAG) 동시 처리 |
| 인증 | NextAuth.js | 로그인/회원가입, 요청자 검증 |
| LLM | Anthropic Claude API (Haiku + Sonnet) | Haiku=라우터(분류), Sonnet=답변 생성·함수 호출 판단 |
| 배포 | Vercel | GitHub 연동 자동 배포, 서버리스 실행 |
| 협업 | Git / GitHub | 버전 관리, push 시 자동 배포 트리거 |

**무료로 처리 가능한 항목**: Next.js, Vercel(Hobby), Supabase(무료 티어), NextAuth.js, GitHub
**소액 과금 항목**: Anthropic API 호출량, 임베딩 생성량 (포트폴리오 규모로는 매우 저렴)

---

## 핵심 기능

### 레이어 1 — 기본 예약 시스템
- 회원가입/로그인 (JWT 기반 인증)
- 자원(회의실, 장비 등) 등록/조회, 시간대별 예약 생성/조회/취소
- **동시성 제어**: 같은 시간대 중복 예약 방지 (Unique 제약, 트랜잭션 격리 수준, 락 적용)
- 관리자 페이지: 예약 현황, 자원 이용률 통계

### 레이어 2 — RAG 기반 질의응답
- 예약 규정/FAQ 문서를 청킹 후 pgvector에 임베딩 저장
- 사용자 질문을 임베딩 → 유사도 검색으로 관련 문서 조회 → Claude가 문서 기반 답변 생성

### 레이어 3 — 함수 호출 기반 에이전트
- 자연어 예약 요청("내일 오후 2시 회의실 잡아줘")을 Claude가 파싱
- `checkAvailability()`, `createReservation()` 등 함수 호출로 실제 예약 처리
- 멀티턴 대화(대안 제안, 확정 응답)까지 지원

### 레이어 4 — 라우터 기반 멀티 에이전트 (1차 적용 범위)
- 사용자 요청을 Claude Haiku(저가 모델)가 먼저 분류: 잡담 / 규정질문 / 예약요청 / 통계질문
- 분류 결과에 따라 처리 방식 분기:
  - 잡담 → AI 호출 없이 즉답
  - 규정질문 → 질의응답 담당(RAG + Sonnet)
  - 예약요청 → 예약 처리 담당(함수 호출 + Sonnet)
  - 통계질문 → 분석 담당(통계 + Sonnet)
- 목적: 모든 요청에 고성능 모델을 쓰지 않고, 필요한 곳에만 비용을 쓰는 구조 설계 경험

---

## 시스템 흐름

```
사용자 (브라우저)
   ↓
Next.js 프론트 (React + TypeScript) — 캘린더 UI, 채팅 인터페이스
   ↓
Next.js API Routes (Node.js + TypeScript)
   ↓
라우터 (Claude Haiku) — 요청 종류 분류
   ├─ 잡담 → 즉답
   ├─ 질의응답 담당 → RAG(pgvector 검색) + Claude Sonnet
   ├─ 예약 처리 담당 → 함수 호출 + Claude Sonnet → Supabase 예약 생성
   └─ 분석 담당 → 통계 집계 + Claude Sonnet
   ↓
Supabase (PostgreSQL + pgvector) — 예약/문서 데이터 저장
   ↓
GitHub → Vercel 자동 배포
```

---

## 진행 순서 (6주 기준)

| 주차 | 작업 |
|---|---|
| 1주차 | Next.js 프로젝트 세팅, Supabase 연결, 기본 예약 CRUD |
| 2주차 | NextAuth 인증, 동시성 제어 구현 |
| 3주차 | Claude API 연동, LLM 게이트웨이(재시도/타임아웃/캐싱) |
| 4주차 | RAG 파이프라인 (문서 청킹, pgvector 검색) |
| 5주차 | 라우터 + 서브 에이전트 구조 (Haiku 분류 → Sonnet 처리 분기) |
| 6주차 | 프론트 채팅 UI 연결, Vercel 배포, README 정리 |

---

## 나중에 확장 가능한 기능 (2차 후보)

- **관리자 자동 리포트**: 스케줄러가 주기적으로 예약 데이터를 집계(SQL) → Claude가 이상 징후/인사이트를 자연어로 요약 → 관리자 대시보드/이메일로 전달
- **예측형 선제 제안**: 사용자의 반복 예약 패턴을 감지해 AI가 먼저 예약을 제안하거나, 취소율이 높은 시간대에 대안을 제시
- **문서 자동 관리**: 관리자가 자유 텍스트로 규정을 입력하면 AI가 정리해서 벡터DB에 자동 반영
- **멀티모달 입력**: 이미지 업로드로 시설 문제를 보고하면 Claude Vision이 상태를 파악해 유지보수 티켓 자동 생성

---

## README에 남길 설계 근거 (면접 대비 소재)

- pgvector를 사용해 별도 벡터DB 없이 PostgreSQL 하나로 RAG를 구현한 이유
- 라우터에 Haiku, 실제 처리에 Sonnet을 나눠 쓴 비용 효율 설계 근거
- 동시성 제어를 어떤 방식(Unique 제약/락/격리 수준)으로 해결했는지
- Vercel 서버리스 타임아웃 제약(기본 10초)을 스트리밍 응답으로 우회한 이유

---

## 기업별 어필 포인트 요약

- **인티그레이션**: Node.js/TypeScript 기반 AI Agent 백엔드, LLM 게이트웨이, RAG, 함수 호출, 에이전트 워크플로우 — 요구사항과 거의 1:1로 대응
- **밸류앤플러스**: React, REST API, PostgreSQL, AI 도구를 활용한 업무 자동화 경험
- **제네시스네스트**: SQL 기반 데이터 모델링, Git 협업, 탄탄한 API 설계 역량
