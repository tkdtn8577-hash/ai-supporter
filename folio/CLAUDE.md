# FOLIO — 인스타그램 트랜드 수집기

> FOLIO 어드민에 추가된 종합 인스타그램 인텔리전스 도구.
> 키워드/해시태그 트랜드 수집, 경쟁사 모니터링, 인플루언서 자동 발굴.

---

## 위치 및 인증

| 항목 | 내용 |
|------|------|
| URL | `/admin/trends` |
| 인증 | **OTP 6자리 코드** (Magic Link → OTP 전환, 2026-07-05) |
| 데이터 | Supabase `bqfgqwmsjamxpasgdwyu` |

### 인증 방식 변경 이력

- **변경 전**: `signInWithOtp` + `emailRedirectTo` → 매직 링크 방식
  - 문제: PKCE code verifier가 요청한 브라우저 localStorage에 저장됨. Gmail 클릭 시 새 브라우저에서 열려 verifier 없음 → 무한 오류 루프
- **변경 후**: `signInWithOtp` (emailRedirectTo 없음) + `verifyOtp` → 6자리 OTP 코드 입력 방식
  - Gmail에서 코드 확인 → 같은 브라우저 입력창에 입력 → PKCE 우회, 크로스브라우저 문제 없음
  - `app/admin/login/page.tsx` 수정: 2단계 UI (코드 발송 → 코드 입력)

### Supabase 대시보드 확인 필요 항목

1. **Authentication → Email Templates → "Confirm signup"** 또는 **"Magic Link"** 템플릿에 `{{ .Token }}` 포함 여부 확인
2. **Authentication → Providers → Email** → OTP 만료 시간 설정 (기본 60분, 권장 유지)
3. `shouldCreateUser: false` 적용 중 → 기존 등록된 계정(`tkdtn8577@gmail.com`)만 로그인 가능

---

## 핵심 기능 5가지

### F1. 해시태그 트랜드 수집
- 키워드 입력 → 관련 해시태그 인기도(게시물 수) 조회
- 카테고리별 모니터링 키워드 등록 (최대 20개)
- 즐겨찾기 해시태그 정기 스냅샷 저장

### F2. 인기 게시물 수집
- 특정 해시태그의 인기 게시물 수집 (좋아요+댓글 기준 상위)
- 게시물 작성자 → 기존 인플루언서 분석기(`/admin/instagram`)로 즉시 연동
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
- 채점 공식 적용: ER 40% + 카테고리 30% + 활동성 15% + 팔로워 15%
- 종합 점수 기반 우선순위 자동 정렬
- 선정 후보 CSV 내보내기

---

## HikerAPI 엔드포인트

```
GET https://api.hikerapi.com/v1/hashtag/by/name?name={hashtag}
  → 해시태그 메타데이터 (media_count, name)

GET https://api.hikerapi.com/v1/hashtag/medias/top?name={hashtag}&count=12
  → 해시태그 인기 게시물 목록

GET https://api.hikerapi.com/v1/user/by/username?username={username}
  → 계정 프로필 (인플루언서 분석기와 동일)

Header: x-access-key: {HIKERAPI_KEY}
```

- API 키는 서버 사이드 전용 (`HIKERAPI_KEY`, `NEXT_PUBLIC_` 없음)
- 비공개 계정 조회 불가
- 비공식 API — Instagram 내부 변경 시 일시적 오류 가능 (통상 24~48시간 내 수정)

---

## DB 스키마 (신규 테이블 4개)

```sql
-- trend_keywords: 모니터링 키워드/해시태그
-- id, keyword, category, is_active, created_at

-- trend_snapshots: 날짜별 해시태그 인기도 스냅샷
-- id, keyword_id, media_count, captured_at

-- monitored_accounts: 경쟁사/벤치마크 계정
-- id, username, label, created_at

-- account_snapshots: 날짜별 계정 지표 스냅샷
-- id, account_id, followers, avg_likes, avg_comments, captured_at

-- RLS: 인증 사용자만 전체 접근
```

---

## 디렉터리 구조

```
folio/
├── lib/
│   └── trends.ts                        # HikerAPI 트랜드 클라이언트 함수
├── app/
│   ├── admin/trends/
│   │   └── page.tsx                     # 트랜드 수집기 메인 (Auth 보호)
│   └── api/instagram/
│       ├── hashtag/route.ts             # 해시태그 조회 프록시
│       └── trending/route.ts            # 인기 게시물 조회 프록시
└── components/admin/trends/
    ├── Dashboard.tsx                    # 메인 UI (탭 라우팅)
    ├── HashtagPanel.tsx                 # 해시태그 트랜드 탭
    ├── TopPostsPanel.tsx                # 인기 게시물 탭
    ├── HistoryChart.tsx                 # 트랜드 히스토리 차트
    ├── CompetitorPanel.tsx              # 경쟁사 모니터링 탭
    └── InfluencerDiscovery.tsx          # 인플루언서 발굴 탭
```

---

## 기능 구현 현황

| 기능 | 상태 |
|------|------|
| 해시태그 트랜드 수집 (HikerAPI) | ✅ |
| 모니터링 키워드 관리 (Supabase) | ✅ |
| 인기 게시물 수집 + 인플루언서 연동 | ✅ |
| 트랜드 히스토리 Chart.js 시각화 | ✅ |
| 경쟁사 계정 등록 + 비교 대시보드 | ✅ |
| 키워드 기반 인플루언서 자동 발굴 | ✅ |
| 선정 우선순위 + CSV 내보내기 | ✅ |

---

## 참고

- 인플루언서 분석기: `/admin/instagram` (채점 공식 공유)
- 기술 설계: `docs/TRD_trends.md`
- 갱신 방식: 수동 갱신 버튼 (Vercel Hobby Cron 미지원으로 자동화 제외)
