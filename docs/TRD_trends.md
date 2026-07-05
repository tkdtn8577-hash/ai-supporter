# TRD: 인스타그램 트랜드 수집기

> PRD 참조: `CLAUDE.md` — Section 3. 인스타그램 트랜드 수집기  
> 기술 스택: Next.js 14 · Tailwind CSS · Supabase · HikerAPI · Chart.js  
> 위치: `folio/` 프로젝트 어드민 확장

---

## 1. 개요

FOLIO 어드민(`/admin/trends`)에 추가되는 인스타그램 인텔리전스 도구.
키워드 기반 해시태그 분석, 경쟁사 모니터링, 인플루언서 자동 발굴 및 우선순위 선정까지 하나의 화면에서 완결한다.

### 확정된 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 해시태그 수집 방식 | 경쟁사 계정 캡션 파싱 | HikerAPI 해시태그 전용 API 불확실, API 키 추가 불필요 |
| 히스토리 수집 | Vercel Cron + 수동 갱신 병행 | 규칙적 히스토리 없으면 차트 무의미 |
| 인플루언서 발굴 통합 | 트랜드 수집기 내 직접 표시 | UX 완결, 채점 로직 `lib/scoring.ts`로 분리·공유 |
| API 비용 관리 | 탭별 독립 갱신 버튼 | 불필요한 API 콜 방지, 비용 통제 |

---

## 2. 아키텍처

### 3-Tier Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Presentation Layer                                          │
│  /admin/trends → TrendsDashboard.tsx (탭 컨테이너)           │
│  ├── HashtagPanel.tsx     (해시태그 트랜드)                  │
│  ├── TopPostsPanel.tsx    (인기 게시물)                      │
│  ├── HistoryChart.tsx     (트랜드 히스토리 Chart.js)         │
│  ├── CompetitorPanel.tsx  (경쟁사 모니터링)                  │
│  └── InfluencerDiscovery.tsx (인플루언서 발굴)               │
├──────────────────────────────────────────────────────────────┤
│  Logic Layer                                                 │
│  lib/trends.ts         ← HikerAPI 트랜드 클라이언트         │
│  lib/scoring.ts        ← 채점 로직 (기존 Dashboard에서 분리) │
│  app/api/instagram/competitor/route.ts  ← 경쟁사 계정 조회  │
│  app/api/instagram/trending/route.ts   ← 인기 게시물 조회   │
│  app/api/cron/snapshot/route.ts        ← 자동 스냅샷 저장   │
├──────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  Supabase: trend_keywords, trend_snapshots                   │
│  Supabase: monitored_accounts, account_snapshots             │
│  HikerAPI (외부 API, 기존 HIKERAPI_KEY 재사용)               │
└──────────────────────────────────────────────────────────────┘
```

### 렌더링 전략

| 페이지 | 방식 | 이유 |
|--------|------|------|
| `/admin/trends` | SSR (서버 렌더링) | 인증 + DB 데이터 초기 로드 |
| 탭 갱신 | Client-side fetch | 버튼 클릭 시 API Route 호출 |
| Cron 스냅샷 | API Route (`/api/cron/snapshot`) | Vercel Cron 트리거 |

---

## 3. 디렉터리 구조

```
folio/
├── app/
│   ├── admin/
│   │   └── trends/
│   │       └── page.tsx                  ← SSR, 인증 확인 + 초기 DB 데이터 로드
│   └── api/
│       ├── instagram/
│       │   ├── competitor/route.ts       ← 경쟁사 계정 프로필+게시물 조회
│       │   └── trending/route.ts        ← 해시태그 인기 게시물 조회
│       └── cron/
│           └── snapshot/route.ts        ← 매일 9시 자동 스냅샷 저장
├── components/admin/trends/
│   ├── TrendsDashboard.tsx              ← 탭 컨테이너
│   ├── HashtagPanel.tsx                 ← 해시태그 트랜드 탭
│   ├── TopPostsPanel.tsx                ← 인기 게시물 탭
│   ├── HistoryChart.tsx                 ← 트랜드 히스토리 차트
│   ├── CompetitorPanel.tsx              ← 경쟁사 모니터링 탭
│   └── InfluencerDiscovery.tsx          ← 인플루언서 발굴 탭
├── lib/
│   ├── trends.ts                        ← HikerAPI 트랜드 전용 함수
│   └── scoring.ts                       ← 채점 로직 (instagram.ts에서 분리)
└── vercel.json                          ← Cron 스케줄 추가
```

---

## 4. 데이터 모델

### 4-1. DB 스키마 (신규 4테이블)

```sql
-- 모니터링 키워드/해시태그 목록
CREATE TABLE trend_keywords (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     text NOT NULL,
  category    text,                    -- '뷰티' | '패션' | '음식' | '여행' 등
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 날짜별 해시태그 인기도 스냅샷
-- media_count는 경쟁사 계정 게시물에서 추출한 빈도 기반
CREATE TABLE trend_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id  uuid REFERENCES trend_keywords(id) ON DELETE CASCADE,
  frequency   integer NOT NULL,        -- 해당 날짜 경쟁사 게시물 내 등장 횟수
  captured_at timestamptz DEFAULT now()
);

-- 경쟁사/벤치마크 계정 목록
CREATE TABLE monitored_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username    text NOT NULL UNIQUE,
  label       text,                    -- '경쟁사A' 같은 별칭
  created_at  timestamptz DEFAULT now()
);

-- 날짜별 계정 지표 스냅샷
CREATE TABLE account_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid REFERENCES monitored_accounts(id) ON DELETE CASCADE,
  followers   integer,
  avg_likes   numeric,
  avg_comments numeric,
  captured_at timestamptz DEFAULT now()
);

-- RLS: 인증된 사용자만 전체 접근 (inquiries 동일 정책)
ALTER TABLE trend_keywords       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only" ON trend_keywords
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin only" ON trend_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin only" ON monitored_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin only" ON account_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 4-2. TypeScript 타입 (`lib/types.ts`에 추가)

```typescript
export interface TrendKeyword {
  id: string
  keyword: string
  category: string | null
  is_active: boolean
  created_at: string
}

export interface TrendSnapshot {
  id: string
  keyword_id: string
  frequency: number
  captured_at: string
}

export interface MonitoredAccount {
  id: string
  username: string
  label: string | null
  created_at: string
}

export interface AccountSnapshot {
  id: string
  account_id: string
  followers: number
  avg_likes: number
  avg_comments: number
  captured_at: string
}

// 인플루언서 채점 결과 (scoring.ts 기반)
export interface ScoredInfluencer {
  username: string
  followers: number
  engagementRate: number
  totalScore: number         // 0–100
  engagementScore: number    // 40%
  categoryScore: number      // 30%
  activityScore: number      // 15%
  followerScore: number      // 15%
  reason: string             // "왜 이 인플루언서인가?"
}
```

### 4-3. `lib/scoring.ts` — 채점 로직 분리

기존 `components/admin/instagram/Dashboard.tsx` 안에 인라인으로 있던 채점 로직을 별도 파일로 추출.

```typescript
// lib/scoring.ts
export function scoreEngagement(avgLikes: number, avgComments: number, followers: number): number
export function scoreCategoryFit(biography: string | undefined, targetCategory: string): number
export function scoreActivity(mediaCount: number, recentPostDays: number): number
export function scoreFollowers(followers: number): number
export function scoreInfluencer(data: InfluencerData, category: string): ScoredInfluencer
```

기존 `Dashboard.tsx`는 이 함수들을 import해서 사용 — 동작 변경 없음, 코드만 이동.

---

## 5. 핵심 모듈 상세 설계

### 5-1. `lib/trends.ts` — HikerAPI 트랜드 클라이언트

```typescript
// 경쟁사 계정의 최근 게시물 조회 (기존 getInfluencerData 재사용)
export async function getCompetitorData(username: string): Promise<InfluencerData>

// 게시물 캡션에서 해시태그 추출
export function extractHashtags(captions: string[]): Record<string, number>
// 반환: { '#뷰티': 12, '#화장품': 8, ... } (빈도수 포함)

// 여러 경쟁사 계정에서 해시태그 집계
export async function collectHashtagTrends(
  usernames: string[]
): Promise<Record<string, number>>
```

### 5-2. API Routes

#### `GET /api/instagram/competitor?username=xxx`
- 기존 `/api/instagram/influencer`와 동일한 구조
- 경쟁사 프로필 + 최근 12개 게시물 반환
- 별도 파일로 분리하는 이유: 용도 분리 + 향후 캐싱 전략 독립 적용 가능

#### `GET /api/instagram/trending?hashtag=xxx&count=12`
- HikerAPI `/v1/hashtag/medias/top` 호출 (가용 여부에 따라 fallback 필요)
- 가용 확인 후 없으면 이 라우트는 제거, 탭2(인기 게시물)는 경쟁사 게시물 목록으로 대체

#### `GET /api/cron/snapshot`
- Vercel Cron이 매일 09:00 KST에 호출
- 모든 `monitored_accounts`의 현재 지표를 `account_snapshots`에 INSERT
- 활성화된 `trend_keywords`의 빈도를 `trend_snapshots`에 INSERT
- 헤더 `Authorization: Bearer ${CRON_SECRET}`으로 외부 직접 호출 차단

### 5-3. Vercel Cron 설정

```json
// vercel.json (기존 파일에 추가)
{
  "functions": { ... },
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> Vercel Hobby: Cron 2개/프로젝트, 최소 1일 1회 간격 — 이 설계로 제한 내 운용 가능

### 5-4. `TrendsDashboard.tsx` — 탭 컨테이너

```tsx
const TABS = ['해시태그', '인기게시물', '히스토리', '경쟁사', '인플루언서 발굴']

// 각 탭은 독립 패널 컴포넌트
// 탭 전환은 URL query param (?tab=hashtag) 또는 로컬 state
// 초기 DB 데이터(keywords, accounts)는 page.tsx에서 SSR로 가져와 props로 전달
```

### 5-5. 어드민 네비게이션 추가

`/admin/page.tsx` 헤더에 "트랜드 수집기" 링크 추가 (기존 "인스타그램 분석" 옆).

---

## 6. 구현 계획

### Phase 1 — 기반 작업 (리팩토링 포함)

- [ ] `lib/scoring.ts` 생성 — Dashboard.tsx에서 채점 로직 추출
- [ ] Dashboard.tsx import 경로 수정, 동작 확인
- [ ] Supabase 마이그레이션 파일 작성 (4테이블 + RLS)
- [ ] `lib/types.ts`에 신규 타입 추가
- [ ] `vercel.json`에 Cron 추가 + `CRON_SECRET` 환경 변수 등록

### Phase 2 — API Routes & Logic

- [ ] `lib/trends.ts` 작성 (`getCompetitorData`, `extractHashtags`, `collectHashtagTrends`)
- [ ] `app/api/instagram/competitor/route.ts`
- [ ] `app/api/cron/snapshot/route.ts`
- [ ] HikerAPI 해시태그 엔드포인트 실제 호출 테스트 → 가용 시 `trending/route.ts` 추가

### Phase 3 — UI 컴포넌트

- [ ] `TrendsDashboard.tsx` (탭 컨테이너)
- [ ] `CompetitorPanel.tsx` (계정 등록 + 지표 표시)
- [ ] `HashtagPanel.tsx` (추출된 해시태그 빈도 랭킹)
- [ ] `HistoryChart.tsx` (Chart.js, 날짜별 팔로워·ER 추이)
- [ ] `TopPostsPanel.tsx` (경쟁사 인기 게시물 목록)
- [ ] `InfluencerDiscovery.tsx` (키워드 입력 → 발굴 → 채점 결과)

### Phase 4 — 페이지 연결 + 마무리

- [ ] `app/admin/trends/page.tsx` — SSR + 인증 + 초기 데이터 로드
- [ ] 어드민 헤더 네비게이션 업데이트
- [ ] Vercel 배포 + Cron 동작 확인
- [ ] 모바일 반응형 QA

**총 예상 작업량: 2~3일**

---

## 7. 리스크 및 완화

| 리스크 | 가능성 | 완화 방안 |
|--------|--------|-----------|
| HikerAPI 해시태그 엔드포인트 미지원 | 중간 | Phase 2에서 즉시 테스트. 없으면 탭2(인기게시물)를 경쟁사 게시물로 대체하고 해시태그는 캡션 추출만 사용. 전체 설계 유지 가능. |
| Vercel Hobby Cron 미작동 | 낮음 | 수동 갱신 버튼이 항상 백업. Cron은 보조 수단. |
| 경쟁사 계정이 비공개로 전환 | 낮음 | 조회 실패 시 해당 계정만 에러 표시, 나머지 정상 진행 |
| API 비용 폭증 (대량 계정 등록) | 낮음 | 계정 최대 20개 상한 + 탭별 독립 갱신으로 통제 |
| 기존 Dashboard.tsx 리팩토링 오류 | 낮음 | 채점 로직 이동 후 기존 인플루언서 분석기 동작 확인 필수 |

---

## 8. 테스트 설계

### 테스트 대상

| 모듈 | 방식 | 핵심 케이스 |
|------|------|-------------|
| `lib/scoring.ts` | 단위 테스트 | 정상 채점, 팔로워 0명 엣지 케이스, 점수 합산 100점 초과 방지 |
| `extractHashtags` | 단위 테스트 | 캡션 배열 → 빈도 맵, 빈 배열, 해시태그 없는 캡션 |
| `/api/cron/snapshot` | 통합 테스트 | CRON_SECRET 없는 요청 401 반환, 정상 호출 시 DB INSERT 확인 |

### 테스트 안 할 것

- Chart.js 렌더링 (육안 확인)
- UI 컴포넌트 (스냅샷 없음)
- Supabase 실제 연동 (개발 서버로 수동 확인)

### 핵심 테스트 케이스

```typescript
// lib/scoring.ts
describe('scoreInfluencer', () => {
  it('정상 데이터 → 0~100 범위 점수 반환')
  it('팔로워 0명 → 0점 반환 (÷0 방지)')
  it('게시물 없음 → 활동성 점수 0점')
})

// lib/trends.ts
describe('extractHashtags', () => {
  it('캡션에서 해시태그 빈도 맵 반환')
  it('빈 배열 입력 → 빈 객체 반환')
  it('해시태그 없는 캡션 → 빈 객체 반환')
})

// /api/cron/snapshot
describe('GET /api/cron/snapshot', () => {
  it('Authorization 헤더 없으면 401 반환')
  it('올바른 CRON_SECRET이면 200 반환')
})
```

---

## 9. 주의사항 (구현 시)

### API 관련

- `HIKERAPI_KEY`는 서버 사이드(`NEXT_PUBLIC_` 없음)에서만 사용. 클라이언트 컴포넌트에서 직접 호출 금지.
- HikerAPI 해시태그 엔드포인트는 **Phase 2 시작 즉시 실제 호출로 가용 여부 확인**. 404 또는 401 반환 시 해당 route.ts 파일 제거하고 캡션 추출 방식으로 전환.
- 경쟁사 계정 갱신 시 계정당 2회 API 호출(프로필 + 게시물). 20개 계정 일괄 갱신 = 40회 소모. 무료 한도(100회) 고려하여 한 번에 10개씩 갱신하는 UI 권장.

### Vercel Cron

- `CRON_SECRET` 환경 변수를 Vercel 대시보드에 등록해야 한다. 없으면 `/api/cron/snapshot`이 외부에서 무제한 호출 가능.
- Vercel Hobby Cron의 최소 간격은 1일이며, 2개까지 등록 가능. 이미 다른 Cron이 있다면 충돌 확인 필요.
- Cron 실패 시 Vercel 대시보드 → Functions → Cron에서 실행 로그 확인 가능.

### DB 마이그레이션

- 4개 신규 테이블 마이그레이션을 **FOLIO Supabase 프로젝트** (`bqfgqwmsjamxpasgdwyu`)에 적용. ARIA/YAMI의 Supabase(`ypmnhjtevocbmwejpeeb`)와 혼동 주의.
- RLS 정책 적용 후 anon으로 SELECT 불가 확인 필수.

### 리팩토링 (채점 로직 분리)

- `lib/scoring.ts`로 이동 후 기존 `components/admin/instagram/Dashboard.tsx`의 import 경로 수정.
- **Dashboard.tsx의 동작이 변경되지 않아야 한다**. 리팩토링 후 기존 인플루언서 분석기를 실제로 실행해서 채점 결과가 동일한지 확인.
- 채점 함수가 순수 함수(입력 → 출력, 외부 상태 없음)인지 확인 후 분리.

### 환경 변수 추가 필요

```
CRON_SECRET=<랜덤 문자열>   ← Cron 엔드포인트 보호용
```
기존 `HIKERAPI_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 그대로 사용.
