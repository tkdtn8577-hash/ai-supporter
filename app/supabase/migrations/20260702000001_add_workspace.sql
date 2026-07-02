-- workspace 컬럼 추가: 'company' (회사용) | 'yami' (YAMI YAMI 개인 사업용)

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS workspace text NOT NULL DEFAULT 'company'
  CHECK (workspace IN ('company', 'yami'));

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS workspace text NOT NULL DEFAULT 'company'
  CHECK (workspace IN ('company', 'yami'));

-- workspace 필터를 지원하는 검색 함수로 교체
DROP FUNCTION IF EXISTS match_document_chunks(vector, int);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(3072),
  match_count     int DEFAULT 5,
  filter_workspace text DEFAULT NULL
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
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.embedding IS NOT NULL
    AND (filter_workspace IS NULL OR d.workspace = filter_workspace)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
