-- pgvector 확장
CREATE EXTENSION IF NOT EXISTS vector;

-- 문서 메타데이터
CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      text NOT NULL,
  source        text NOT NULL CHECK (source IN ('upload', 'drive')),
  drive_file_id text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 청크 + 벡터 (multilingual-e5-small: 384차원)
CREATE TABLE document_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(384),
  chunk_index int NOT NULL
);
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 대화 세션
CREATE TABLE conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text,
  created_at timestamptz DEFAULT now()
);

-- 개별 메시지
CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  document_id uuid,
  content     text,
  chunk_index int,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
