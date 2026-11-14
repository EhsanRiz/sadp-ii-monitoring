-- 110_seed_organizations.sql
-- The implementing partner (4D Climate Solutions). Run after migrations 010-100.

INSERT INTO public.organizations (code, name)
VALUES ('4D', '4D Climate Solutions')
ON CONFLICT (code) DO NOTHING;
