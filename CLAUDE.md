# AI Supporter — 프로젝트 통합 문서

이 저장소에는 두 개의 독립적인 Next.js 프로젝트가 있습니다.

| 디렉터리 | 프로젝트 | 용도 |
|----------|----------|------|
| `app/` | ARIA / YAMI YAMI AI | 사내 AI 비서 (문서 RAG + 채팅) |
| `folio/` | FOLIO | 1인 웹 에이전시 랜딩페이지 + 어드민 |

---

# 1. ARIA / YAMI YAMI AI (`app/`)

## 개요

테크솔루션즈 대표(1인)가 문서를 업로드하고 자연어로 질문하면 AI가 즉시 답해주는 개인용 AI 비서.
하나의 앱에서 두 개의 워크스페이스를 상단 토글로 전환하여 사용.

| 워크스페이스 | 이름 | 색상 | 용도 |
|---|---|---|---|
| `company` | ARIA | 파란색 | 테크솔루션즈 사내 업무 |
| `yami` | YAMI | 보라색 | YAMI YAMI 개인 사업 |

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14.2 (App Router) |
| 스타일 | Tailwind CSS |
| 벡터 DB | Supabase pgvector |
| 임베딩 | Google Generative AI - `gemini-embedding-001` (3072차원, v1 API) |
| 채팅 AI | Google Gemini API - `gemini-2.5-flash` |
| 파일 파싱 | pdf-parse, mammoth, xlsx |
| 배포 | Vercel (Hobby 플랜) |
| 인증 | 없음 (1인 사용) |

## 인프라

### Vercel
- **프로덕션 URL:** `https://app-ten-omega-n5i2q4i5i6.vercel.app`
- **프로젝트명:** `app` (tkdtn8577-hashs-projects 팀)

### Supabase
- **Project ID:** `ypmnhjtevocbmwejpeeb`
- **URL:** `https://ypmnhjtevocbmwejpeeb.supabase.co`
- **Region:** ap-northeast-1 (Tokyo)
- **마이그레이션 적용 완료:**
  - `20260630000000_init.sql` — 초기 스키마
  - `20260701000000_fix_vector_search.sql` — HNSW 인덱스 교체 + 함수 재생성
  - `20260702000000_update_embedding_dim_768.sql` — 임베딩 모델 교체 (384→3072차원), 인덱스 제거
  - `20260702000001_add_workspace.sql` — workspace 컬럼 추가, 검색 함수 workspace 필터 추가

### DB 스키마
```sql
-- pgvector 확장
-- documents: 파일 메타데이터 + workspace ('company' | 'yami')
-- document_chunks: 텍스트 청크 + vector(3072) 임베딩 (인덱스 없음 - 소규모라 sequential scan)
-- conversations: 대화 세션 + workspace
-- messages: 개별 메시지 (role: user | assistant)
-- match_document_chunks(query_embedding, match_count, filter_workspace): workspace 필터 벡터 검색
```

### 환경 변수 (`app/.env.local` + Vercel 등록 완료)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GOOGLE_API_KEY   ← Gemini + Embedding API 키 (Google AI Studio)
```

## 디렉터리 구조

```
app/
├── .env.local
├── vercel.json             # 함수 타임아웃 설정
├── next.config.mjs
├── lib/
│   ├── supabase.ts
│   └── embeddings.ts       # gemini-embedding-001 (v1 API)
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # workspace 상태 관리, WorkspaceSwitcher 포함
│   ├── globals.css
│   └── api/
│       ├── chat/route.ts       # workspace별 시스템 프롬프트 + 검색
│       ├── upload/route.ts     # workspace 파라미터로 문서 저장
│       └── documents/route.ts  # workspace 필터 문서 목록/삭제
├── components/
│   ├── WorkspaceSwitcher.tsx
│   ├── ChatInterface.tsx
│   ├── Sidebar.tsx
│   └── UploadModal.tsx
└── public/
    ├── icon.svg
    └── manifest.json
```

## 핵심 흐름

### 채팅
1. 상단 토글로 워크스페이스 선택 → 질문 입력
2. 클라이언트: Supabase에 conversations + user message 저장
3. `POST /api/chat` — `{ question, history[], workspace }` 전송
4. 서버: 질문 임베딩 → `match_document_chunks` → Gemini 스트리밍
5. 클라이언트: 실시간 렌더링 → assistant message 저장

### 파일 업로드
1. UI 또는 `watch_folder.mjs` 자동 감지
2. `POST /api/upload` — `{ file, workspace }` 전송
3. 서버: 파싱 → 청킹(500자) → 임베딩 → `document_chunks` 저장
4. 배치 크기: 5청크씩 처리

### 폴더 자동 감시
```bash
node watch_folder.mjs
```
- `ai_supporter/` 루트 파일 → `workspace: company`
- `YAMI YAMI_ai/` 폴더 파일 → `workspace: yami`
- 지원 형식: `.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx`

## 주의사항

- Gemini API 키: `gemini-2.5-flash` 사용 (`gemini-1.5-flash` 미지원, `gemini-2.0-flash` 무료 할당량 0)
- 임베딩 SDK 호출 시 반드시 `{ apiVersion: 'v1' }` 옵션 필요 (기본값 v1beta → 404)
- HNSW 인덱스 최대 2000차원 제한 → 3072차원이라 인덱스 없이 sequential scan
- 임베딩 모델 변경 시 기존 벡터 데이터 전체 재업로드 필요
- Vercel Hobby 플랜: 함수 타임아웃 최대 60초

## 개발 명령어

```bash
cd app
npm run dev
npm run build
npx tsc --noEmit
npx vercel --prod --token <vercel_token> --yes --scope tkdtn8577-hashs-projects
```

## 구현 완료 기능

| 기능 | 상태 |
|------|------|
| 파일 업로드 (txt/csv/pdf/docx/xlsx) | ✅ |
| 벡터 임베딩 + Supabase 저장 | ✅ |
| 동일 파일 재업로드 시 덮어쓰기 | ✅ |
| 자연어 채팅 (Gemini 스트리밍) | ✅ |
| 멀티턴 대화 히스토리 | ✅ |
| RAG (pgvector 검색 → AI 컨텍스트) | ✅ |
| 빠른 질문 버튼 4개 (워크스페이스별) | ✅ |
| 마크다운 렌더링 | ✅ |
| 대화 기록 자동 저장 + 사이드바 + 삭제 | ✅ |
| PWA manifest + SVG 아이콘 | ✅ |
| 모바일 반응형 레이아웃 | ✅ |
| 파일 목록 조회 + 삭제 | ✅ |
| 회사 AI / YAMI YAMI AI 워크스페이스 분리 | ✅ |
| 폴더 감시 자동 업로드 | ✅ |
| Vercel 배포 | ✅ |

---

# 2. FOLIO (`folio/`)

## 개요

1인 웹 에이전시의 포트폴리오 + 문의 수집 랜딩페이지.
Apple 스타일 다크 테마, Vercel + Supabase 기반.
어드민 페이지에서 문의 관리 + **인스타그램 인플루언서 분석** 기능 제공.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 스타일 | Tailwind CSS |
| 애니메이션 | Framer Motion |
| DB / 인증 | Supabase (PostgreSQL + Auth Magic Link) |
| 인스타그램 분석 | HikerAPI (서드파티, Facebook 계정 불필요) |
| 차트 | Chart.js + react-chartjs-2 |
| 배포 | Vercel Hobby |

## 인프라

### Supabase
- **Project ID:** `bqfgqwmsjamxpasgdwyu`
- **URL:** `https://bqfgqwmsjamxpasgdwyu.supabase.co`
- **인증:** Magic Link (tkdtn8577@gmail.com)

### DB 스키마
```sql
-- inquiries: 고객 문의 (name, phone, email, budget, message, status, created_at)
-- status: 'new' | 'checked' | 'done'
-- RLS: INSERT는 anon 허용, SELECT/UPDATE/DELETE는 인증 사용자만
```

### 환경 변수 (`folio/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
HIKERAPI_KEY             ← HikerAPI 키 (서버 사이드 전용, NEXT_PUBLIC_ 없음)
SUPABASE_SERVICE_ROLE_KEY ← Cron 스냅샷 저장용 (RLS 우회, Supabase → Settings → API → service_role)
CRON_SECRET              ← /api/cron/snapshot 보호용 임의 문자열
```

## 디렉터리 구조

```
folio/
├── .env.local
├── next.config.mjs
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── types.ts            # Inquiry, Work 타입
│   ├── works.ts            # 포트폴리오 데이터 (하드코딩)
│   └── instagram.ts        # HikerAPI 클라이언트 함수
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # 랜딩페이지 (Hero/Services/Works/Process/Pricing/Contact)
│   ├── globals.css
│   ├── actions/
│   │   ├── inquiry.ts      # 문의 폼 Server Action
│   │   └── admin.ts        # 상태 변경/삭제 Server Action
│   ├── admin/
│   │   ├── page.tsx        # 문의 관리 (Supabase Auth 보호)
│   │   ├── login/page.tsx  # Magic Link 로그인
│   │   └── instagram/
│   │       └── page.tsx    # 인스타그램 분석 (Auth 보호, hasApiKey 전달)
│   └── api/
│       ├── auth/signout/route.ts
│       └── instagram/
│           └── influencer/route.ts   # HikerAPI 프록시 (API 키 서버 보호)
└── components/
    ├── admin/
    │   ├── InquiryTable.tsx
    │   ├── InquiryModal.tsx
    │   └── instagram/
    │       └── Dashboard.tsx         # 인플루언서 분석 메인 UI
    ├── ui/
    │   ├── Navbar.tsx
    │   ├── Footer.tsx
    │   └── AnimateOnScroll.tsx
    └── sections/
        ├── Hero.tsx / Services.tsx / Works.tsx
        ├── Process.tsx / Pricing.tsx / Contact.tsx
```

## 인증 흐름 (Magic Link)

```
/admin/login → signInWithOtp → emailRedirectTo: /auth/callback?next=/admin
/auth/callback → exchangeCodeForSession → 세션 쿠키 설정 → /admin 리다이렉트
middleware.ts → /admin/** 보호 (단, /admin/login, /auth/* 제외)
```

## 어드민 페이지

| URL | 기능 | 인증 |
|-----|------|------|
| `/admin` | 문의 목록 관리 (상태 변경/삭제) | Magic Link |
| `/admin/login` | 이메일 로그인 링크 발송 | - |
| `/auth/callback` | Magic Link 코드 → 세션 교환 | - |
| `/admin/instagram` | 인스타그램 인플루언서 분석 | Magic Link |
| `/admin/trends` | 인스타그램 트랜드 수집기 | Magic Link |

## 인스타그램 인플루언서 분석기

### 배경
Facebook 개발자 계정 잠금(수 주째 해제 불가)으로 Meta Graph API 사용 불가.
**HikerAPI**(서드파티)로 대체 — Facebook 계정 없이 동일 기능 제공.

### HikerAPI 선택 근거

| 항목 | HikerAPI | SociaVault |
|------|----------|------------|
| 무료 요청 | **100회** | 50회 |
| 이후 단가 | **$0.0006/회** | $0.005/회 |
| 문서화 | Swagger 완비 | 제한적 |

→ 10명 분석 = 약 20회 요청 → 무료 100회로 최소 5세션 사용 가능

### API 엔드포인트
```
GET https://api.hikerapi.com/v1/user/by/username?username={username}
GET https://api.hikerapi.com/v1/user/medias/chunk?user_id={pk}&count=12
Header: x-access-key: {HIKERAPI_KEY}
```

### 데이터 흐름
```
브라우저 → GET /api/instagram/influencer?username=xxx
              ↓ (서버, API 키 숨김)
         HikerAPI 프로필 + 게시물 조회
              ↓
브라우저 ← { followers, media[], biography, ... }
              ↓
         채점 → 결과 표시
```

### 채점 공식
```
종합 점수 = 참여율(40%) + 카테고리 적합도(30%) + 활동성(15%) + 팔로워 적정성(15%)
참여율 = (avgLikes + avgComments) / followers × 100
```

### 기능 목록
- 계정명 최대 10개 동시 분석 (600ms 간격)
- 팔로워 규모별 필터 (나노/마이크로/매크로/메가)
- 카테고리 키워드 매칭 (뷰티/패션/음식/여행 등 10개)
- Chart.js 참여율·종합점수 차트
- 스냅샷 저장/불러오기 (localStorage, 최대 20개)
- CSV 내보내기 (16개 컬럼)
- "왜 이 인플루언서인가?" 자동 추천 이유 생성

### HikerAPI 초기 설정 (1회)
1. [hikerapi.com](https://hikerapi.com) 가입 (이메일만, 신용카드 불필요)
2. 대시보드에서 API Key 복사
3. `folio/.env.local` → `HIKERAPI_KEY=발급받은키`
4. Vercel 환경 변수에도 동일하게 등록 후 Redeploy

### 주의사항
- 비공개 계정 조회 불가
- 좋아요 수 숨김 계정은 `like_count = 0`으로 반환될 수 있음
- 비공식 API — Instagram 내부 변경 시 일시적 오류 가능 (통상 24~48시간 내 수정)

## 개발 명령어

```bash
cd folio
npm run dev
npm run build
npx tsc --noEmit
```

## 구현 완료 기능

| 기능 | 상태 |
|------|------|
| 랜딩페이지 6개 섹션 (Hero/Services/Works/Process/Pricing/Contact) | ✅ |
| 문의 폼 → Supabase 저장 | ✅ |
| 어드민 문의 관리 (상태 변경/삭제/필터) | ✅ |
| Magic Link 인증 + /auth/callback 세션 교환 | ✅ |
| **인스타그램 인플루언서 분석기 (HikerAPI)** | ✅ |
| **채점 시스템 (ER·카테고리·활동성·팔로워)** | ✅ |
| **Chart.js 시각화** | ✅ |
| **스냅샷 저장 + CSV 내보내기** | ✅ |
| **인스타그램 트랜드 수집기 (/admin/trends)** | ✅ |
| **경쟁사 계정 모니터링 + Vercel Cron 자동 스냅샷** | ✅ |
| **해시태그 트랜드 (경쟁사 캡션 파싱)** | ✅ |
| **키워드 기반 인플루언서 발굴 + 우선순위 정렬** | ✅ |

---

# 3. 인스타그램 트랜드 수집기 (FOLIO 어드민 신규 기능)

## 개요

FOLIO 어드민 페이지에 추가되는 종합 인스타그램 인텔리전스 도구.
키워드/해시태그 기반 트랜드 수집, 경쟁사 모니터링, 키워드에 맞는 인플루언서를 자동 발굴해 선정 우선순위를 매긴다.
기존 인플루언서 분석기(HikerAPI + 채점 시스템)와 연동하여 시너지를 극대화.

| 위치 | `/admin/trends` |
|------|----------------|
| 인증 | Magic Link (기존 어드민 인증 공유) |
| 데이터 | Supabase DB 저장 (히스토리 추적 가능) |

## 핵심 기능 5가지

### F1. 해시태그 트랜드 수집
- 키워드 입력 → 관련 해시태그 인기도(게시물 수) 조회
- 카테고리별 모니터링 키워드 등록 (최대 20개)
- 즐겨찾기 해시태그 정기 스냅샷 저장

### F2. 인기 게시물 수집
- 특정 해시태그의 인기 게시물 수집 (좋아요+댓글 기준 상위)
- 게시물 작성자 → 기존 인플루언서 분석기로 즉시 연동
- 수집된 게시물 Supabase 저장 및 히스토리 조회

### F3. 트랜드 히스토리 & 시각화
- 날짜별 해시태그 인기도 변화 추이 저장
- Chart.js 시각화: 게시물 증가율 트랜드, 참여율 트랜드
- 기간 필터: 1주 / 1달 / 3달

### F4. 경쟁사 계정 모니터링
- 경쟁사/벤치마크 계정 최대 20개 등록
- 최신 게시물 수동 갱신 + 참여율 변화 추적
- 경쟁사 비교 대시보드 (팔로워·ER 병렬 비교)

### F5. 키워드 기반 인플루언서 발굴 & 우선순위 선정
- 키워드 입력 → 해시태그 상위 게시물 작성자 자동 수집
- 기존 채점 공식(ER 40% + 카테고리 30% + 활동성 15% + 팔로워 15%) 적용
- 종합 점수 기반 우선순위 자동 정렬
- 선정 후보 CSV 내보내기 (선정 리포트)

## 기술 스택 추가

| 항목 | 내용 |
|------|------|
| 데이터 소스 | HikerAPI (기존 `HIKERAPI_KEY` 활용) |
| DB | Supabase (FOLIO 기존 프로젝트 `bqfgqwmsjamxpasgdwyu`) |
| 차트 | Chart.js + react-chartjs-2 (기존 의존성) |
| 갱신 방식 | 수동 갱신 버튼 (Vercel Hobby Cron 미지원으로 자동화 제외) |

## HikerAPI 추가 엔드포인트

```
GET https://api.hikerapi.com/v1/hashtag/by/name?name={hashtag}
  → 해시태그 메타데이터 (media_count, name)

GET https://api.hikerapi.com/v1/hashtag/medias/top?name={hashtag}&count=12
  → 해시태그 인기 게시물 목록

GET https://api.hikerapi.com/v1/user/by/username?username={username}
  → 계정 프로필 (기존 인플루언서 분석기와 동일)
```

## DB 스키마 추가 (신규 테이블 4개)

```sql
-- trend_keywords: 모니터링 키워드/해시태그
-- id, keyword, category, is_active, created_at

-- trend_snapshots: 날짜별 해시태그 인기도 스냅샷
-- id, keyword_id, media_count, captured_at

-- monitored_accounts: 경쟁사/벤치마크 계정
-- id, username, label, created_at

-- account_snapshots: 날짜별 계정 지표 스냅샷
-- id, account_id, followers, avg_likes, avg_comments, captured_at

-- RLS: 인증 사용자만 전체 접근 (inquiries 동일 정책)
```

## 어드민 URL 추가

| URL | 기능 | 탭 |
|-----|------|----|
| `/admin/trends` | 트랜드 수집기 메인 | 해시태그 / 인기게시물 / 히스토리 / 경쟁사 / 인플루언서 발굴 |

## 디렉터리 구조 (신규)

```
folio/
├── lib/
│   └── trends.ts                  # HikerAPI 트랜드 클라이언트 함수
├── app/
│   ├── admin/trends/
│   │   └── page.tsx               # 트랜드 수집기 메인 (Auth 보호)
│   └── api/instagram/
│       ├── hashtag/route.ts       # 해시태그 조회 프록시
│       └── trending/route.ts      # 인기 게시물 조회 프록시
└── components/admin/trends/
    ├── Dashboard.tsx              # 트랜드 수집기 메인 UI
    ├── HashtagPanel.tsx           # 해시태그 트랜드 탭
    ├── TopPostsPanel.tsx          # 인기 게시물 탭
    ├── HistoryChart.tsx           # 트랜드 히스토리 차트
    ├── CompetitorPanel.tsx        # 경쟁사 모니터링 탭
    └── InfluencerDiscovery.tsx    # 인플루언서 발굴 탭
```

## 구현 예정 기능

| 기능 | 상태 |
|------|------|
| 해시태그 트랜드 수집 (HikerAPI) | 🔲 |
| 모니터링 키워드 관리 (Supabase) | 🔲 |
| 인기 게시물 수집 + 인플루언서 연동 | 🔲 |
| 트랜드 히스토리 Chart.js 시각화 | 🔲 |
| 경쟁사 계정 등록 + 비교 대시보드 | 🔲 |
| 키워드 기반 인플루언서 자동 발굴 | 🔲 |
| 선정 우선순위 + CSV 내보내기 | 🔲 |

---

# 참고 문서

```
docs/
├── PRD.md                    # AI 비서 초기 PRD
├── PRD_landing.md            # FOLIO 랜딩페이지 PRD
├── TRD_landing.md            # FOLIO 기술 설계 문서
├── instagram_tool_report.md  # 인스타그램 API 선택 리포트
└── TRD_trends.md             # 트랜드 수집기 기술 설계 문서 (예정)
```
