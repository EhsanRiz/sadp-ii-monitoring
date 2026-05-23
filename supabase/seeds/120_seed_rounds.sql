-- 120_seed_rounds.sql
-- SADP-II funding rounds. Round 3 is currently active; Round 4 is upcoming.
-- Update start_date / end_date as confirmed by SADP-II programme office.

INSERT INTO public.rounds (id, name, status, start_date, end_date) VALUES
  (3, 'Round 3', 'active',   '2025-01-01', NULL),
  (4, 'Round 4', 'upcoming', NULL,         NULL)
ON CONFLICT (id) DO NOTHING;
