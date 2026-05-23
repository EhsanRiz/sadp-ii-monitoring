-- 010_extensions.sql
-- Enable extensions the rest of the schema relies on.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- belt + braces for uuid generation

-- Generic updated_at trigger function — used on most tables.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
