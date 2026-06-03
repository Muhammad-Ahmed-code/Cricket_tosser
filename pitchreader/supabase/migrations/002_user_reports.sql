-- Add user_id to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS reports_user_id_idx ON reports(user_id);

-- Post-match reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  toss_won BOOLEAN,
  toss_decision TEXT CHECK (toss_decision IN ('bat', 'bowl')),
  match_won BOOLEAN,
  actual_par_score INTEGER,
  pitch_rating INTEGER CHECK (pitch_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to extract Clerk user ID from JWT (sub claim)
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::TEXT
$$;

-- RLS on reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reports" ON reports
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Service role can insert reports" ON reports
  FOR INSERT WITH CHECK (true);

-- RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reviews" ON reviews
  FOR ALL USING (user_id = requesting_user_id());
