# PRD: 테크솔루션즈 사내 AI 비서 (코드네임: ARIA)

> 회사 문서를 Google Drive 또는 직접 업로드로 관리하고, 자연어로 질문하면 즉시 답해주는 개인용 사내 AI 비서.

---

## 1. 제품 비전

- **한 줄 요약**: 회사 데이터를 내가 원하는 방식으로 넣어두면, 언제 어디서든 자연어로 물어볼 수 있는 나만의 AI 비서
- **왜 만드는가**: 거래처 연락처, 미수금 현황, 회의 액션 아이템 등 흩어진 문서를 매번 열어보는 것이 비효율. 기존 AI(ChatGPT 등)는 내 회사 데이터를 모름.
- **타겟 사용자**: 테크솔루션즈 대표 (1인, 혼자 사용)

---

## 2. 핵심 원칙

| 원칙 | 설명 |
|------|------|
| 무료 인프라 | Vercel + Supabase 무료 티어, 유료 구독 없음 |
| 무마찰 데이터 관리 | 파일 추가 시 코드 수정·재배포 없이 버튼 1번으로 반영 |
| 모바일 퍼스트 | 이동 중에도 사용 가능한 PWA (홈 화면 추가 지원) |
| 최소 복잡도 | 인증 없음, 외부 서비스 최소화, 직관적 UI |
| 한국어 최우선 | 모든 UI·답변·검색이 한국어 기준 |

---

## 3. 기능 요구사항

### P0 — Must Have (MVP)

#### F1: 문서 업로드 및 동기화
- **유저 스토리**: 나는 회사 문서를 앱에 넣어두고 싶다. 매번 수동으로 복사하거나 코드를 수정하고 싶지 않다.
- **상세 요구사항**:
  - 지원 파일 형식: `.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx`
  - 방법 A — **앱 내 업로드**: 설정 페이지에서 파일 드래그&드롭 또는 선택
  - 방법 B — **Google Drive 동기화**: 지정 폴더 연동 후 "동기화" 버튼 1번으로 변경분 자동 반영
  - 업로드된 파일은 청크(단락) 분할 → 임베딩 → Supabase에 저장
  - 동일 파일명 재업로드 시 기존 데이터 덮어쓰기
  - 파일별 저장 상태(처리 중 / 완료 / 오류) 표시
- **기술 결정**: 임베딩은 `transformers.js` + `Xenova/multilingual-e5-small` 모델 사용 (무료, 서버 사이드 실행)

#### F2: 자연어 채팅
- **유저 스토리**: 나는 "LG CNS 미수금 언제야?" 같이 자연어로 물어보면 즉시 답을 받고 싶다.
- **상세 요구사항**:
  - 질문 입력 → Supabase pgvector에서 관련 청크 Top 5 검색 → Claude에게 전달 → 스트리밍 답변
  - 답변은 타이핑 효과(스트리밍)로 출력
  - 마크다운 렌더링 지원 (표, 목록, 굵은 글씨)
  - 빠른 질문 버튼 4개 (홈 화면 진입 시 노출):
    - "이번 달 미수금 현황 알려줘"
    - "VIP 거래처 목록 보여줘"
    - "이번 달 주요 일정은?"
    - "오늘 액션 아이템 정리해줘"
  - 데이터에 없는 정보는 "해당 내용은 등록된 문서에서 찾을 수 없습니다"로 명확히 안내

#### F3: 대화 기록 저장 및 조회
- **유저 스토리**: 나는 지난번에 했던 질문과 답변을 다시 볼 수 있으면 좋겠다.
- **상세 요구사항**:
  - 모든 대화는 Supabase `conversations` 테이블에 자동 저장
  - 사이드바(PC) / 하단 서랍(모바일)에서 과거 대화 목록 표시
  - 대화 제목: 첫 번째 질문 앞 20자 자동 생성
  - 과거 대화 클릭 시 해당 세션 복원
  - 대화 삭제 기능

#### F4: PWA (Progressive Web App)
- **유저 스토리**: 나는 모바일에서도 앱처럼 사용하고 싶다.
- **상세 요구사항**:
  - 홈 화면에 추가 가능 (manifest.json)
  - 모바일 기준 반응형 레이아웃
  - iOS Safari, Android Chrome 모두 지원

---

### P1 — Should Have

#### F5: 파일 관리
- 등록된 파일 목록 조회 (파일명, 업로드 일시, 청크 수)
- 개별 파일 삭제

#### F6: 동기화 상태 표시
- Google Drive 연동 상태 (연결됨 / 미연결)
- 마지막 동기화 일시
- 동기화 중 로딩 인디케이터

---

### P2 — Nice to Have

#### F7: 데이터 소스 태그
- 답변 하단에 "출처: 거래처목록.txt" 형태로 참조 파일 표시

#### F8: 모바일 공유 기능
- 카카오톡/문자로 답변 내용 공유

---

## 4. 기술 제약

### 베이스 스택
| 레이어 | 기술 | 이유 |
|--------|------|------|
| 프레임워크 | Next.js 14 (App Router) | Vercel 최적화, API 라우트 내장 |
| 스타일 | Tailwind CSS | 모바일 반응형 빠르게 구현 |
| 벡터 DB | Supabase pgvector | 무료, PostgreSQL 기반, 관리 불필요 |
| 임베딩 | transformers.js `multilingual-e5-small` | **완전 무료**, 한국어 지원, API 키 불필요 |
| 채팅 AI | Claude API (`claude-sonnet-4-6`) | 한국어 최상급, 스트리밍 지원 |
| 파일 파싱 | pdf-parse, mammoth, xlsx | 각 형식별 무료 파서 |
| Drive 연동 | Google Drive API v3 | 무료 |
| 배포 | Vercel Hobby (무료) | HTTPS 자동, 글로벌 CDN |
| 인증 | 없음 | 1인 사용, 복잡도 최소화 |

### 아키텍처 원칙
- 서버 컴포넌트 우선, 클라이언트 컴포넌트 최소화
- 임베딩은 서버 사이드에서만 실행 (무거운 모델 로딩을 클라이언트에 강요 안 함)
- Supabase는 단일 진실의 원천 (파일 메타, 청크, 대화 기록 모두)
- Google Drive 연동 실패해도 업로드 UI는 항상 동작해야 함

### 데이터 모델

```sql
-- 업로드된 문서 메타데이터
CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    text NOT NULL,
  source      text NOT NULL CHECK (source IN ('upload', 'drive')),
  drive_file_id text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 청크 + 벡터
CREATE TABLE document_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(384),   -- multilingual-e5-small 차원
  chunk_index int NOT NULL
);
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- 대화 세션
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  created_at  timestamptz DEFAULT now()
);

-- 개별 메시지
CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  created_at      timestamptz DEFAULT now()
);
```

### 성능 목표
| 항목 | 목표 |
|------|------|
| 첫 답변 스트리밍 시작 | 3초 이내 |
| 벡터 검색 | 500ms 이내 |
| 파일 업로드 처리 (1MB) | 10초 이내 |

---

## 5. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 인프라 비용 | $0/월 (Vercel + Supabase 무료 티어) |
| API 비용 | Claude API 사용량 기반 (개인 사용 기준 월 $1~3 예상) |
| 모바일 지원 | iOS 15+, Android 10+ |
| 브라우저 | Chrome, Safari, Edge 최신 버전 |
| 파일 크기 제한 | 단일 파일 10MB 이하 |
| 저장 용량 | Supabase 무료 500MB 이내 (수백 개 문서 수용 가능) |

---

## 6. 범위 밖 (Out of Scope)

- 다중 사용자 / 팀 공유 기능
- 사용자 인증 / 권한 관리
- 실시간 협업
- 모바일 네이티브 앱 (iOS App Store / Google Play 배포)
- 이미지, 동영상 파일 분석
- 이메일 / 슬랙 / CRM 직접 연동
- 오프라인 동작

---

## 7. 성공 지표

| 지표 | 목표 |
|------|------|
| 질문 → 정확한 답변 | 등록 데이터 기반 질문의 90% 이상 정확 |
| 신규 파일 반영 속도 | 업로드/동기화 후 즉시 검색 가능 |
| 월 인프라 비용 | $0 유지 |
| 모바일 사용성 | iPhone / Android 홈 화면 추가 후 정상 동작 |

---

## 8. 용어 정의

| 용어 | 의미 |
|------|------|
| RAG | Retrieval-Augmented Generation. 문서를 검색한 뒤 AI에게 전달해 답변 생성 |
| 청크 | 문서를 검색 단위로 분할한 텍스트 조각 (약 500자) |
| 임베딩 | 텍스트를 벡터(숫자 배열)로 변환한 것. 의미 기반 검색에 사용 |
| pgvector | PostgreSQL 확장. 벡터 저장 및 유사도 검색 지원 |
| PWA | Progressive Web App. 웹 앱을 모바일 홈 화면에 설치해 네이티브 앱처럼 사용 |
| Drive 동기화 | Google Drive 지정 폴더의 변경 파일을 앱에 자동 반영하는 작업 |
| ARIA | AI Retrieval & Intelligence Assistant. 이 프로젝트 코드네임 |
