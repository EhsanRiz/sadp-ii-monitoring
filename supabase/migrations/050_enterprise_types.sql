-- 050_enterprise_types.sql
-- Catalog of enterprise types observed in real 4D data, grouped by category.
-- ESMP templates in Phase 2 will be per-category (crops / livestock / aquaculture / processing).

CREATE TABLE IF NOT EXISTS public.enterprise_types (
  id          smallint    PRIMARY KEY,
  code        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  category    text        NOT NULL CHECK (category IN ('crops','livestock','aquaculture','processing')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.enterprise_types IS
  '17 types seeded by 130_seed_enterprise_types.sql. category drives Phase 2 ESMP template routing.';
