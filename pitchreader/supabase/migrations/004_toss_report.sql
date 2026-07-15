-- Stage 1 (Toss Report) completion flag.
-- toss_won and toss_decision already exist from migration 002.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS toss_report_completed BOOLEAN DEFAULT FALSE;
