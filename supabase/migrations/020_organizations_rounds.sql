-- 020_organizations_rounds.sql
-- Top-level tenant table and the SADP-II rounds catalog.

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS
  'Implementing partners. Phase 1 expects two rows: 4D, RSDA. Seeded by 110_seed_organizations.sql.';

CREATE TABLE IF NOT EXISTS public.rounds (
  id          smallint    PRIMARY KEY,
  name        text        NOT NULL,
  status      text        NOT NULL CHECK (status IN ('upcoming','active','closed')),
  start_date  date,
  end_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rounds IS
  'SADP-II funding rounds. Round 3 active in 2026; Round 4 upcoming. Seeded by 120_seed_rounds.sql.';
