-- Replace actual_par_score with innings-by-innings scoring on the reviews table.
-- Keeping actual_par_score column intact (data preservation); we stop writing to it going forward.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS first_innings_runs     INTEGER,
  ADD COLUMN IF NOT EXISTS first_innings_wickets  INTEGER CHECK (first_innings_wickets BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS first_innings_overs    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS second_innings_runs    INTEGER,
  ADD COLUMN IF NOT EXISTS second_innings_wickets INTEGER CHECK (second_innings_wickets BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS second_innings_overs   NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS first_innings_team     TEXT CHECK (first_innings_team IN ('user', 'opposition'));
