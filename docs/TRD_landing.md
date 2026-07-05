# TRD: 1인 웹 에이전시 랜딩페이지 (코드네임: FOLIO)

> PRD 참조: `/docs/PRD_landing.md`
> 기술 스택: Next.js 14 · Tailwind CSS · Framer Motion · Supabase · Vercel

---

## 1. 개요

홈페이지 제작 1인 에이전시의 포트폴리오 + 문의 수집 랜딩페이지.
Apple 스타일 다크 테마, 단일 스크롤 페이지 + 어드민 페이지 구성.

### 확정된 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 프로젝트 위치 | 새 독립 레포 (`folio/`) | 도메인 연결 시 Vercel 설정 단순화 |
| 폼 처리 | Next.js Server Action | 코드 간결, API 파일 불필요 |
| 어드민 보호 | Next.js Middleware | 서버 단에서 미인증 요청 차단 |
| 애니메이션 | Framer Motion | 스크롤 트리거 애니메이션 빠른 구현 |

---

## 2. 아키텍처

### 3-Tier Layered Architecture

```
┌─────────────────────────────────────────────┐
│  Presentation Layer (React Components)       │
│  Hero / Services / Works / Process /         │
│  Pricing / Contact / Admin Table             │
├─────────────────────────────────────────────┤
│  Logic Layer (TypeScript)                    │
│  폼 유효성 검사 / 인증 체크 / 상태 필터링    │
│  Server Actions / Middleware                 │
├─────────────────────────────────────────────┤
│  Data Layer                                  │
│  Supabase Auth (Magic Link)                  │
│  Supabase DB (inquiries 테이블)              │
│  works.ts (포트폴리오 정적 데이터)           │
└─────────────────────────────────────────────┘
```

### 렌더링 전략

| 페이지 | 방식 | 이유 |
|--------|------|------|
| `/` (랜딩) | SSG (정적 생성) | 콘텐츠 변경 없음, 최대 속도 |
| `/admin` | SSR (서버 렌더링) | 인증 + 실시간 문의 데이터 |
| `/admin/login` | SSG | 정적 로그인 UI |

---

## 3. 디렉터리 구조

```
folio/                          ← 새 프로젝트 루트
├── app/
│   ├── layout.tsx              ← 공통 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx                ← 랜딩페이지 (섹션 조합)
│   ├── globals.css
│   ├── admin/
│   │   ├── page.tsx            ← 문의 목록 (SSR, 인증 필요)
│   │   └── login/
│   │       └── page.tsx        ← Magic Link 이메일 입력
│   └── actions/
│       ├── inquiry.ts          ← 문의 저장 Server Action
│       └── admin.ts            ← 상태 변경 Server Action
├── components/
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Services.tsx
│   │   ├── Works.tsx
│   │   ├── Process.tsx
│   │   ├── Pricing.tsx
│   │   └── Contact.tsx
│   ├── ui/
│   │   ├── AnimateOnScroll.tsx ← Framer Motion 스크롤 트리거 래퍼
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── admin/
│       ├── InquiryTable.tsx
│       ├── StatusBadge.tsx
│       └── InquiryModal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← 브라우저용 Supabase 클라이언트
│   │   └── server.ts           ← 서버용 Supabase 클라이언트
│   └── works.ts                ← 포트폴리오 데이터 (하드코딩)
├── middleware.ts                ← /admin 라우트 보호
└── supabase/
    └── migrations/
        └── 20260702000000_init.sql
```

---

## 4. 데이터 모델

### DB 스키마

```sql
-- 고객 문의 테이블
CREATE TABLE inquiries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text NOT NULL,
  email      text,
  budget     text,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- RLS 정책
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 누구나 문의 등록 가능 (폼 제출)
CREATE POLICY "anyone can insert"
  ON inquiries FOR INSERT TO anon WITH CHECK (true);

-- 인증된 사용자(대표)만 조회/수정/삭제 가능
CREATE POLICY "admin can select"
  ON inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin can update"
  ON inquiries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin can delete"
  ON inquiries FOR DELETE TO authenticated USING (true);
```

### TypeScript 타입

```typescript
// lib/types.ts

export type InquiryStatus = 'new' | 'checked' | 'done'

export interface Inquiry {
  id: string
  name: string
  phone: string
  email: string | null
  budget: string | null
  message: string
  status: InquiryStatus
  created_at: string
}

export type BudgetOption =
  | '150만원 미만'
  | '150~300만원'
  | '300~500만원'
  | '500만원 이상'
  | '미정'

export interface Work {
  id: string
  title: string
  category: '웹사이트' | '랜딩페이지' | '쇼핑몰'
  thumbnail: string   // 이미지 경로 or 외부 URL
  url?: string        // 실제 사이트 링크 (없으면 모달)
}
```

---

## 5. 핵심 모듈 상세 설계

### 5-1. Middleware (어드민 보호)

```typescript
// middleware.ts
// /admin/** 요청 시 Supabase 세션 확인 → 없으면 /admin/login으로 리다이렉트

export const config = {
  matcher: ['/admin/:path*']
}
```

- Supabase SSR 패키지의 `createServerClient`로 쿠키에서 세션 읽음
- 세션 없으면 `/admin/login?redirectTo=/admin`으로 리다이렉트
- 세션 있으면 그대로 통과

### 5-2. Server Action — 문의 저장

```typescript
// app/actions/inquiry.ts
'use server'

export async function submitInquiry(formData: FormData) {
  // 1. 서버에서 유효성 검사 (name, phone, message 필수)
  // 2. Supabase 서버 클라이언트로 inquiries 테이블에 INSERT
  // 3. 성공/실패 결과 반환 → 클라이언트에서 UI 전환
}
```

### 5-3. AnimateOnScroll 컴포넌트

```typescript
// components/ui/AnimateOnScroll.tsx
// Framer Motion whileInView 활용
// 자식 컴포넌트를 감싸면 스크롤 진입 시 fadeInUp 자동 적용

// 사용 예시
<AnimateOnScroll>
  <ServiceCard ... />
</AnimateOnScroll>
```

### 5-4. 포트폴리오 데이터

```typescript
// lib/works.ts
// 작업물 추가 시 이 파일만 수정 후 git push → Vercel 자동 배포

export const works: Work[] = [
  {
    id: '1',
    title: '프로젝트명',
    category: '랜딩페이지',
    thumbnail: '/works/project1.png',
    url: 'https://example.com'
  },
  // ...
]
```

### 5-5. Magic Link 로그인 흐름

```
1. /admin/login 에서 이메일 입력 (tkdtn8577@gmail.com 고정)
2. Supabase signInWithOtp() 호출 → 이메일로 링크 발송
3. 링크 클릭 → Supabase가 세션 쿠키 설정 → /admin으로 리다이렉트
4. Middleware에서 세션 확인 → 통과
```

---

## 6. 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase anon 키만 필요. Google API 키 불필요 (이 프로젝트는 임베딩/AI 미사용).

---

## 7. 구현 계획

### Phase 1 — 기반 세팅 (0.5일)
- [ ] Next.js 14 프로젝트 생성 (`folio/`)
- [ ] Tailwind CSS + Framer Motion 설치
- [ ] Supabase 프로젝트 생성 + 마이그레이션 실행
- [ ] 환경 변수 설정
- [ ] Vercel 프로젝트 연결

### Phase 2 — 랜딩페이지 UI (2일)
- [ ] 공통: Navbar, Footer, AnimateOnScroll
- [ ] Hero 섹션 (타이포그래피 + CTA)
- [ ] Services 섹션 (카드 3개)
- [ ] Works 섹션 (포트폴리오 그리드 + `works.ts`)
- [ ] Process 섹션 (타임라인)
- [ ] Pricing 섹션 (시작가 표시)
- [ ] Contact 섹션 (폼 + Server Action)

### Phase 3 — 어드민 (1일)
- [ ] Middleware 설정
- [ ] `/admin/login` — Magic Link 이메일 발송 UI
- [ ] `/admin` — 문의 목록 테이블
- [ ] 상태 변경 (신규 → 확인 → 완료)
- [ ] 문의 상세 모달
- [ ] 삭제 기능

### Phase 4 — 마무리 (0.5일)
- [ ] 모바일 반응형 QA
- [ ] Lighthouse 성능 측정 (목표: 90점 이상)
- [ ] Vercel 프로덕션 배포
- [ ] 커스텀 도메인 연결 (선택)

**총 예상 기간: 4일**

---

## 8. 리스크 및 완화

| 리스크 | 가능성 | 완화 방안 |
|--------|--------|-----------|
| Magic Link 이메일이 스팸함에 들어감 | 중간 | Supabase 이메일 설정에서 발신자 도메인 설정, 초기 테스트 필수 |
| 포트폴리오 이미지 없음 (초기) | 높음 | placeholder 이미지로 먼저 구현, 실제 작업물 준비 후 교체 |
| Framer Motion 번들 크기 | 낮음 | 랜딩페이지는 번들 크기보다 비주얼 임팩트가 우선, 허용 범위 내 |
| Supabase RLS 설정 실수로 문의 데이터 노출 | 낮음 | 마이그레이션에서 RLS 정책 명시적으로 정의, 배포 전 anon 권한 테스트 |

---

## 9. 테스트 설계

이 프로젝트는 UI 중심 + 1인 사용이므로 테스트 범위를 실용적으로 제한.

### 테스트 대상

| 모듈 | 방식 | 이유 |
|------|------|------|
| `submitInquiry` Server Action | 단위 테스트 | 핵심 비즈니스 로직, 유효성 검사 오류 케이스 중요 |
| Middleware 인증 체크 | 단위 테스트 | 세션 있음/없음 두 케이스만 검증 |
| 폼 유효성 검사 로직 | 단위 테스트 | 필수 필드 누락, 연락처 형식 오류 |

### 테스트 안 할 것

- UI 컴포넌트 (Storybook/스냅샷 없음 — 비주얼은 브라우저로 직접 확인)
- Supabase 실제 DB 연동 (로컬 개발 서버로 수동 확인)
- 애니메이션 동작 (육안 확인)

### 핵심 테스트 케이스

```typescript
// submitInquiry 테스트
describe('submitInquiry', () => {
  it('필수 필드 누락 시 에러 반환')
  it('정상 데이터 제출 시 Supabase에 저장')
  it('Supabase 오류 발생 시 에러 메시지 반환')
})

// Middleware 테스트
describe('middleware', () => {
  it('세션 없으면 /admin/login으로 리다이렉트')
  it('세션 있으면 /admin 통과')
})
```
