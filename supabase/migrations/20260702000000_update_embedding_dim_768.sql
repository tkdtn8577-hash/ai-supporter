-- 임베딩 모델 변경: multilingual-e5-small(384) → gemini-embedding-001(3072)
-- HNSW는 최대 2000차원 제한으로 사용 불가 → 인덱스 없이 sequential scan 사용
-- 1인 소규모 앱에서는 sequential scan으로 충분

TRUNCATE document_chunks;

-- 기존 인덱스 제거
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- 벡터 차원 변경 384 → 3072
ALTER TABLE document_chunks
  ALTER COLUMN embedding TYPE vector(3072);

-- 검색 함수 재생성 (3072차원)
DROP FUNCTION IF EXISTS match_document_chunks(vector, int);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(3072),
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
