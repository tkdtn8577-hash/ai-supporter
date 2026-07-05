-- FOLIO: 고객 문의 테이블 + RLS 정책
CREATE TABLE IF NOT EXISTS inquiries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text NOT NULL,
  email      text,
  budget     text,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('new', 'checked', 'done'))
);

-- RLS 활성화
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- anon: INSERT만 허용 (문의 폼 제출)
CREATE POLICY "anyone can insert"
  ON inquiries FOR INSERT TO anon WITH CHECK (true);

-- authenticated(대표): SELECT / UPDATE / DELETE 허용
CREATE POLICY "admin can select"
  ON inquiries FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin can update"
  ON inquiries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "admin can delete"
  ON inquiries FOR DELETE TO authenticated USING (true);

-- 최신순 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);
