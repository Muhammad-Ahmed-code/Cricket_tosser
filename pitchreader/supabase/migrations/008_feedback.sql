-- User feedback table

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message     TEXT        NOT NULL DEFAULT '',
  app_version TEXT        NOT NULL DEFAULT '',
  platform    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

-- RLS: anyone can insert (authenticated or anonymous), nobody can read their own rows
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (true);
