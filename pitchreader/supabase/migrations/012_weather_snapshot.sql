ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS weather_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;
