# ARIA / YAMI YAMI AI - 사내 AI 비서 프로젝트

## 프로젝트 개요

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

## 인프라 설정 완료

### Vercel
- **프로덕션 URL:** `https://app-ten-omega-n5i2q4i5i6.vercel.app`
- **프로젝트명:** `app` (tkdtn8577-hashs-projects 팀)
- **환경 변수:** Vercel 대시보드에 등록 완료

### Supabase
- **Project ID:** `ypmnhjtevocbmwejpeeb`
- **URL:** `https://ypmnhjtevocbmwejpeeb.supabase.co`
- **Region:** ap-northeast-1 (Tokyo)
- **마이그레이션 적용 완료:**
  - `20260630000000_init.sql` — 초기 스키마
  - `20260701000000_fix_vector_search.sql` — HNSW 인덱스 교체 + 함수 재생성
  - `20260702000000_update_embedding_dim_768.sql` — 임베딩 모델 교체 (384→3072차원), 인덱스 제거
  - `20260702000001_add_workspace.sql` — workspace 컬럼 추가, 검색 함수 workspace 필터 추가

### DB 스키마 (현재 상태)
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
ai_supporter/
├── CLAUDE.md
├── watch_folder.mjs            # 폴더 감시 스크립트 (자동 업로드)
├── YAMI YAMI_ai/               # YAMI YAMI 문서 드롭 폴더 (자동 생성)
├── 거래처목록.txt               # 회사 문서 예시
├── 매출현황.csv
├── 회의록_3월.txt
├── docs/
│   └── PRD.md
├── supabase/
│   ├── config.toml
│   └── migrations/             # 루트 migrations (app/과 동일 복사본)
└── app/                        # Next.js 앱 루트
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
    │   ├── WorkspaceSwitcher.tsx  # 회사 AI ↔ YAMI YAMI 전환 토글
    │   ├── ChatInterface.tsx      # workspace별 UI (색상, 이름, 빠른 질문)
    │   ├── Sidebar.tsx            # workspace별 대화 목록
    │   └── UploadModal.tsx        # workspace별 파일 관리
    └── public/
        ├── icon.svg
        └── manifest.json
```

## 핵심 흐름

### 채팅 흐름
1. 상단 토글로 워크스페이스 선택 (company / yami)
2. 사용자 질문 입력
3. 클라이언트: Supabase에 conversations(workspace) + user message 저장
4. `POST /api/chat` 호출 — `{ question, history[], workspace }` 전송
5. 서버: 질문 임베딩 → `match_document_chunks(embedding, 5, workspace)` → workspace별 시스템 프롬프트 → Gemini 스트리밍
6. 클라이언트: 실시간 렌더링 → assistant message 저장

### 파일 업로드 흐름
1. UI에서 업로드 또는 `watch_folder.mjs` 자동 감지
2. `POST /api/upload` — `{ file, workspace }` 전송
3. 서버: 파싱 → 청킹(500자) → 임베딩(gemini-embedding-001) → `document_chunks` 저장 (workspace 포함)
4. 동일 파일명+workspace 조합 재업로드 시 기존 데이터 덮어쓰기
5. 배치 크기: 5청크씩 처리

### 폴더 자동 감시 (`watch_folder.mjs`)
```bash
node watch_folder.mjs
```
- `ai_supporter/` 루트에 파일 추가 → `workspace: company`로 업로드
- `YAMI YAMI_ai/` 폴더에 파일 추가 → `workspace: yami`로 업로드
- 지원 형식: `.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx`
- 업로드 대상: Vercel 프로덕션 API

## 임베딩 모델 변경 이력

| 시점 | 모델 | 차원 | 이유 |
|------|------|------|------|
| 초기 | `Xenova/multilingual-e5-small` | 384 | 로컬 실행 |
| 현재 | `gemini-embedding-001` | 3072 | Vercel 서버리스 호환 (로컬 모델 다운로드 불가) |

- SDK 호출 시 반드시 `{ apiVersion: 'v1' }` 옵션 필요 (기본값 v1beta에서는 404)
- 이 API 키로 사용 가능한 임베딩 모델: `gemini-embedding-001`, `gemini-embedding-2`
- HNSW 인덱스는 최대 2000차원 제한 → 3072차원이라 인덱스 없이 sequential scan 사용

## 개발 명령어

```bash
cd app
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npx tsc --noEmit # 타입 체크
```

## Supabase CLI 명령어

```bash
cd app
npx supabase login --token <token>
npx supabase link --project-ref ypmnhjtevocbmwejpeeb
npx supabase db push   # 마이그레이션 적용
```

> `supabase/migrations/`는 `app/supabase/migrations/`에도 복사본 존재 (CLI 경로 이슈로 중복)

## Vercel 재배포 명령어

```bash
cd app
npx vercel --prod --token <vercel_token> --yes --scope tkdtn8577-hashs-projects
```

## 구현 완료 기능

| 기능 | 상태 |
|------|------|
| 파일 업로드 (txt/csv/pdf/docx/xlsx) | ✅ |
| 벡터 임베딩 + Supabase 저장 | ✅ |
| 동일 파일 재업로드 시 덮어쓰기 | ✅ |
| 자연어 채팅 (Gemini 스트리밍) | ✅ |
| 멀티턴 대화 히스토리 (맥락 유지) | ✅ |
| RAG (pgvector 검색 → AI 컨텍스트) | ✅ |
| 빠른 질문 버튼 4개 (워크스페이스별) | ✅ |
| 마크다운 렌더링 | ✅ |
| 대화 기록 자동 저장 | ✅ |
| 대화 목록 사이드바 | ✅ |
| 대화 삭제 | ✅ |
| PWA manifest + SVG 아이콘 | ✅ |
| 모바일 반응형 레이아웃 | ✅ |
| 파일 목록 조회 + 삭제 | ✅ |
| **회사 AI / YAMI YAMI AI 워크스페이스 분리** | ✅ |
| **폴더 감시 자동 업로드** | ✅ |
| **Vercel 배포** | ✅ |

## 미구현 기능 (향후)

| 기능 |
|------|
| Google Drive 동기화 |
| 답변 출처 파일 표시 |
| 모바일 공유 기능 |

## 주의사항

- Gemini API 키: `gemini-1.5-flash` 미지원, `gemini-2.0-flash` 무료 할당량 0 → `gemini-2.5-flash` 사용
- Supabase anon 키는 `NEXT_PUBLIC_` 접두사로 클라이언트 노출 (RLS 미사용, 1인 전용)
- 임베딩 모델 변경 시 기존 벡터 데이터 전체 재업로드 필요
- Vercel Hobby 플랜: 함수 타임아웃 최대 60초 (대용량 PDF는 제한될 수 있음)
