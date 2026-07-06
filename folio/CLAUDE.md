# FOLIO — 어드민 대시보드

> Next.js 기반 FOLIO 어드민 패널.
> 문의 관리 · 인스타그램 경쟁사 모니터링 · 인플루언서 분석.

---

## 프로젝트 구조

```
folio/
├── app/
│   ├── admin/
│   │   ├── page.tsx              # 문의 관리 (메인 어드민)
│   │   ├── login/page.tsx        # OTP 로그인 (2단계)
│   │   ├── trends/page.tsx       # 트랜드 수집기
│   │   └── instagram/page.tsx    # 인플루언서 분석
│   ├── api/instagram/
│   │   ├── influencer/route.ts   # 계정 분석 프록시
│   │   └── trending/route.ts     # 해시태그 프록시 (미사용)
│   └── auth/callback/route.ts    # PKCE 콜백
├── components/admin/trends/
│   ├── TrendsDashboard.tsx       # 탭 라우터 (4탭)
│   ├── CompetitorPanel.tsx       # 경쟁사 모니터링
│   ├── HashtagPanel.tsx          # 해시태그 분석
│   ├── HistoryChart.tsx          # 팔로워/ER 히스토리
│   └── InfluencerDiscovery.tsx   # 인플루언서 분석
├── lib/
│   ├── instagram.ts              # HikerAPI 클라이언트
│   ├── scoring.ts                # 인플루언서 채점 공식
│   ├── trends.ts                 # 해시태그 집계 유틸
│   └── types.ts                  # 공통 타입
├── middleware.ts                 # 세션 검사 + /auth/callback 리다이렉트
└── .env.local                    # 환경 변수
```

---

## 인증 (OTP 6자리)

| 항목 | 내용 |
|------|------|
| 방식 | `signInWithOtp` + `verifyOtp` (OTP 토큰 모드) |
| 이메일 | `tkdtn8577@gmail.com` |
| 발송 | Resend SMTP (smtp.resend.com:587 STARTTLS) |
| Rate limit | 60회/시간 |
| OTP 길이 | 6자리 |
| 만료 | 10분 (600초) |

### OTP 방식 선택 이유
- Magic Link 방식: Gmail 클릭 시 새 브라우저에서 열림 → PKCE code verifier 불일치 → 인증 실패
- OTP 방식: 같은 브라우저에서 코드 입력 → PKCE 우회, 크로스브라우저 문제 없음

### Supabase 설정 현황
- Project: `bqfgqwmsjamxpasgdwyu`
- SMTP: Resend (smtp.resend.com:587, `resend@folio.com`)
- 이메일 템플릿: `mailer_templates_magic_link_content`에 `{{ .Token }}` 포함
- `shouldCreateUser: false` → 기존 계정(`tkdtn8577@gmail.com`)만 로그인 가능

### 로그인 흐름
1. `/admin/login` → "인증 코드 받기" 클릭
2. Gmail에서 6자리 코드 확인 (제목: "Folio Admin 로그인 코드")
3. 코드 입력 → `verifyOtp` → `window.location.href = '/admin'` (전체 reload로 쿠키 반영)

### 주의
- `router.push` 대신 `window.location.href` 사용 — full reload 없으면 미들웨어가 쿠키를 읽기 전에 실행됨
- 세션이 유효한 경우 로그인 없이 바로 진입 가능 (정상 동작)

---

## 트랜드 수집기 (`/admin/trends`)

### 탭 구성 (4개)

| 탭 | 기능 | 상태 |
|----|------|------|
| 경쟁사 모니터링 | 계정 등록 → 팔로워/ER 수동 갱신 | ✅ 작동 |
| 해시태그 분석 | 경쟁사 게시물 캡션에서 해시태그 집계 | ✅ 작동 |
| 히스토리 | 팔로워/ER 변화 추이 차트 | ✅ 작동 |
| 인플루언서 분석 | 계정명 입력 → 채점 + 랭킹 | ✅ 작동 |

### HikerAPI 사용 가능 엔드포인트

```
✅ GET /v1/user/by/username?username={username}   → 프로필 조회
✅ GET /v1/user/medias/chunk?user_id={id}&count=N → 최근 게시물

❌ GET /v1/hashtag/medias/top?name={hashtag}      → 미지원 (항상 오류)
```

- 해시태그 직접 검색 불가 → "인기게시물" 탭 제거
- 인플루언서 발굴 시 계정명을 미리 알아야 함 (인스타 직접 검색 후 붙여넣기)

### 인플루언서 채점 공식

```
종합점수 = ER점수(40%) + 카테고리적합도(30%) + 활동성(15%) + 팔로워등급(15%)

- ER점수: 동급 평균 대비 참여율 비율
- 카테고리적합도: 게시물 캡션 + 바이오에서 키워드 매칭
- 활동성: 주 게시 횟수 (3~7회/주 = 만점)
- 팔로워등급: 마이크로(1만~10만) = 100점, 메가(100만+) = 60점
```

---

## DB 스키마

```sql
-- monitored_accounts: 경쟁사 계정
-- id, username, label, created_at

-- account_snapshots: 날짜별 지표 스냅샷 (Cron 자동 저장)
-- id, account_id, followers, avg_likes, avg_comments, captured_at

-- RLS: 인증 사용자만 전체 접근
```

---

## 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://bqfgqwmsjamxpasgdwyu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
HIKERAPI_KEY=3eynsyfn4n3m6djra726q45dubo1qfjq
```

---

## 알려진 제한사항

- HikerAPI 비공개 계정 조회 불가
- HikerAPI 해시태그 검색 엔드포인트 미지원 → 키워드로 인플루언서 자동 발굴 불가
- Vercel Hobby 플랜 → Cron은 코드에 있으나 실행 안 됨 (수동 갱신만 가능)
- OTP 이메일 미수신 시 rate limit(60/h) 또는 스팸함 확인
