-- 트랜드 수집기 스키마 (FOLIO 프로젝트: bqfgqwmsjamxpasgdwyu)

-- 모니터링 키워드/해시태그 목록
CREATE TABLE IF NOT EXISTS trend_keywords (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     text NOT NULL,
  category    text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 날짜별 해시태그 빈도 스냅샷
CREATE TABLE IF NOT EXISTS trend_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id  uuid REFERENCES trend_keywords(id) ON DELETE CASCADE,
  frequency   integer NOT NULL DEFAULT 0,
  captured_at timestamptz DEFAULT now()
);

-- 경쟁사/벤치마크 계정
CREATE TABLE IF NOT EXISTS monitored_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username    text NOT NULL UNIQUE,
  label       text,
  created_at  timestamptz DEFAULT now()
);

-- 날짜별 계정 지표 스냅샷
CREATE TABLE IF NOT EXISTS account_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid REFERENCES monitored_accounts(id) ON DELETE CASCADE,
  followers    integer,
  avg_likes    numeric,
  avg_comments numeric,
  captured_at  timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE trend_keywords     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots  ENABLE ROW LEVEL SECURITY;

-- authenticated 사용자만 전체 접근
CREATE POLICY "admin only" ON trend_keywords
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin only" ON trend_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin only" ON monitored_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin only" ON account_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS trend_snapshots_keyword_id_idx ON trend_snapshots (keyword_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS account_snapshots_account_id_idx ON account_snapshots (account_id, captured_at DESC);
