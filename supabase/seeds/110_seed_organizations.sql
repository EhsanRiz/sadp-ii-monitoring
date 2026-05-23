-- 110_seed_organizations.sql
-- The two implementing partners. Run after migrations 010-100.

INSERT INTO public.organizations (code, name)
VALUES ('4D',   '4D Climate Solutions'),
       ('RSDA', 'RSDA')
ON CONFLICT (code) DO NOTHING;
