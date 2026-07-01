# ARIA - 사내 AI 비서 프로젝트

## 프로젝트 개요

테크솔루션즈 대표(1인)가 사내 문서를 업로드하고 자연어로 질문하면 AI가 즉시 답해주는 개인용 사내 AI 비서.
코드네임: **ARIA** (AI Retrieval & Intelligence Assistant)

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14.2 (App Router) |
| 스타일 | Tailwind CSS |
| 벡터 DB | Supabase pgvector |
| 임베딩 | `@xenova/transformers` - `Xenova/multilingual-e5-small` (384차원) |
| 채팅 AI | Google Gemini API - `gemini-2.5-flash` |
| 파일 파싱 | pdf-parse, mammoth, xlsx |
| 배포 | Vercel (미정) |
| 인증 | 없음 (1인 사용) |

## 인프라 설정 완료

### Supabase
- **Project ID:** `ypmnhjtevocbmwejpeeb`
- **URL:** `https://ypmnhjtevocbmwejpeeb.supabase.co`
- **Region:** ap-northeast-1 (Tokyo)
- **마이그레이션:** `supabase/migrations/20260630000000_init.sql` 적용 완료

### DB 스키마 (적용 완료)
```sql
-- pgvector 확장
-- documents: 파일 메타데이터
-- document_chunks: 텍스트 청크 + vector(384) 임베딩
-- conversations: 대화 세션
-- messages: 개별 메시지 (role: user | assistant)
-- match_document_chunks(): 벡터 유사도 검색 함수 (cosine)
```

### 환경 변수 (`app/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GOOGLE_API_KEY   ← Gemini API 키 (Google AI Studio에서 발급)
```

## 디렉터리 구조

```
ai_supporter/
├── docs/
│   └── PRD.md                  # 제품 요구사항 문서
├── supabase/
│   ├── config.toml             # Supabase CLI 설정
│   └── migrations/
│       └── 20260630000000_init.sql
└── app/                        # Next.js 앱 루트
    ├── .env.local              # 환경 변수 (gitignore)
    ├── next.config.mjs         # webpack + serverExternalPackages 설정
    ├── lib/
    │   ├── supabase.ts         # Supabase 클라이언트 싱글톤
    │   └── embeddings.ts       # transformers.js 임베딩 (서버 전용)
    ├── app/
    │   ├── layout.tsx          # PWA 메타데이터, 한국어 설정
    │   ├── page.tsx            # 메인 페이지 (사이드바 + 채팅)
    │   ├── globals.css
    │   └── api/
    │       ├── chat/route.ts       # Gemini 스트리밍 답변 (POST)
    │       ├── upload/route.ts     # 파일 파싱 + 임베딩 + 저장 (POST)
    │       └── documents/route.ts  # 문서 목록/삭제 (GET, DELETE)
    ├── components/
    │   ├── ChatInterface.tsx   # 채팅 UI (메시지 + 입력창 + 빠른 질문)
    │   ├── Sidebar.tsx         # 대화 목록 사이드바
    │   └── UploadModal.tsx     # 파일 업로드/관리 모달
    └── public/
        └── manifest.json       # PWA manifest
```

## 핵심 흐름

### 채팅 흐름
1. 사용자 질문 입력
2. 클라이언트: Supabase에 conversations + user message 저장
3. `POST /api/chat` 호출 → 서버에서 질문 임베딩 → pgvector 검색 (Top 5 청크) → Gemini에 컨텍스트 포함 프롬프트 전송
4. 스트리밍 응답을 클라이언트에서 실시간 표시
5. 클라이언트: Supabase에 assistant message 저장

### 파일 업로드 흐름
1. 사용자가 파일 선택 (드래그&드롭 또는 클릭)
2. `POST /api/upload` 호출 → 서버에서 파싱 → `passage: {텍스트}` 형식으로 청킹 → 임베딩 → Supabase 저장
3. 동일 파일명 재업로드 시 기존 데이터 자동 삭제 후 재저장
4. 배치 크기: 5청크씩 처리

### 임베딩 규칙
- 쿼리: `query: {질문텍스트}` 형식
- 문서 청크: `passage: {청크텍스트}` 형식
- multilingual-e5-small은 이 prefix 방식으로 동작

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

## 구현 완료 기능 (PRD 기준)

| 기능 | PRD 항목 | 상태 |
|------|----------|------|
| 파일 업로드 (txt/csv/pdf/docx/xlsx) | F1 | ✅ |
| 벡터 임베딩 + Supabase 저장 | F1 | ✅ |
| 동일 파일 재업로드 시 덮어쓰기 | F1 | ✅ |
| 자연어 채팅 (Gemini 스트리밍) | F2 | ✅ |
| RAG (pgvector 검색 → AI 컨텍스트) | F2 | ✅ |
| 빠른 질문 버튼 4개 | F2 | ✅ |
| 마크다운 렌더링 | F2 | ✅ |
| 대화 기록 자동 저장 | F3 | ✅ |
| 대화 목록 사이드바 | F3 | ✅ |
| 대화 삭제 | F3 | ✅ |
| PWA manifest | F4 | ✅ |
| 모바일 반응형 레이아웃 | F4 | ✅ |
| 파일 목록 조회 + 삭제 | F5 | ✅ |

## 미구현 기능 (향후)

| 기능 | PRD 항목 |
|------|----------|
| Google Drive 동기화 | F6 |
| 답변 출처 파일 표시 | F7 |
| 모바일 공유 기능 | F8 |
| PWA 아이콘 이미지 파일 (icon-192.png, icon-512.png) | F4 |

## 주의사항

- `@xenova/transformers` 임베딩 모델은 첫 실행 시 다운로드로 1~2분 소요 (이후 캐시됨)
- Gemini API 키(`GOOGLE_API_KEY`)는 `.env.local`에만 있고 클라이언트에 노출되지 않음
- Supabase anon 키는 `NEXT_PUBLIC_` 접두사로 클라이언트에 노출 (RLS 미사용, 1인 전용 앱)
- `supabase/migrations/` 폴더는 `app/supabase/migrations/`에도 복사본 존재 (CLI 경로 이슈로 중복)
