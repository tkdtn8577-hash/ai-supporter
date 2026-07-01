-- IVFflat 인덱스 제거 (소규모 데이터에서 probes=1 이면 검색 실패)
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- 소규모 데이터에 적합한 HNSW 인덱스로 교체 (정확도 높음)
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 벡터 유사도 검색 함수 재생성 (threshold 없이 무조건 top-N 반환)
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
