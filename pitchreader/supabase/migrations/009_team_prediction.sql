-- Add team_prediction column to reports table to persist squad-specific analysis.
-- The Edge Function already attempts to save this field; without the column it silently
-- falls back to saving without it (PGRST204), causing the "My Team" tab to disappear
-- when a report is reopened from History.

alter table reports
  add column if not exists team_prediction jsonb;
