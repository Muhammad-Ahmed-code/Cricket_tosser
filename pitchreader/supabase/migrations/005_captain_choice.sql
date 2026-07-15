-- Stores what the captain would have chosen had they won the toss (lost-toss reports only).
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS captain_choice TEXT CHECK (captain_choice IN ('bat', 'bowl'));
