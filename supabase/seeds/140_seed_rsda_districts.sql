-- 140_seed_rsda_districts.sql
-- The 4 RSDA districts in southern Lesotho.
-- Community Councils, Resource Centers, and Villages for RSDA are added
-- incrementally via the Geography admin UI as the data is collected (RSDA's
-- catalog hasn't been received yet).

INSERT INTO public.districts (organization_id, name)
SELECT (SELECT id FROM public.organizations WHERE code='RSDA'), d
  FROM (VALUES
    ('Mafeteng'),
    ('Mohale''s Hoek'),
    ('Quithing'),
    ('Qacha''s Nek')
  ) AS t(d)
ON CONFLICT (organization_id, name) DO NOTHING;
