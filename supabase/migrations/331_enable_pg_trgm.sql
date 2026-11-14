-- 331_enable_pg_trgm.sql
-- Enable the standard pg_trgm extension (trigram similarity). Used for the
-- Round 3 contribution import's fuzzy name-matching, and available for future
-- fuzzy search on enterprise / beneficiary names. Additive and behaviour-safe.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
