-- Lightweight error log for Claude API failures.
-- Inserted by the Edge Function (service role) whenever a Claude call fails
-- or requires a retry, giving us observability without needing edge_logs access.
-- requesting_user_id() is defined in 002_user_reports.sql.

CREATE TABLE IF NOT EXISTS analysis_errors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,
  ground_name   TEXT,
  status_code   INTEGER,
  attempt_count INTEGER,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analysis_errors_user_id_idx    ON analysis_errors(user_id);
CREATE INDEX IF NOT EXISTS analysis_errors_created_at_idx ON analysis_errors(created_at DESC);

ALTER TABLE analysis_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own error rows" ON analysis_errors
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Service role can insert errors" ON analysis_errors
  FOR INSERT WITH CHECK (true);
