-- ============================================================================
-- import_central_progress_may2026.sql
-- ============================================================================
-- Imports the 165 enterprises from "SADP II Central Region Progress May 2026.xlsx"
-- into public.enterprises. Each row pulls geo + type + contact + service provider
-- from the original Round-3 catalog CSV (07_sample_enterprises_round3.csv) via
-- fuzzy name match; progress columns come straight from the May 2026 sheet.
--
-- Safe to re-run: ON CONFLICT (organization_id, registration_number) is NULL-aware
-- (registration_number is null for now, so re-runs would actually duplicate).
-- For safety we DELETE existing enterprise rows in the 4D org first.
--
-- Prerequisite:
--   * migration 120_progress_tracking_and_budget.sql applied
--   * 4D geography fully loaded (3 districts / 27 CCs / 17 RCs / 140 villages)
-- ============================================================================

-- Wipe any existing 4D enterprises so this import is the source of truth.
DELETE FROM public.enterprises
 WHERE organization_id = (SELECT id FROM public.organizations WHERE code='4D');

-- The geo-consistency trigger sets organization_id from district_id, so we
-- only need to look up district. CC / RC / village look up via name within
-- the same district.


INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Shandu',
  'Shandu Enterprise',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Matukeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58867332',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Bushman',
  'Bushman''s Valley Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Nqheku' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62768726',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Moloinyane',
  'Moloinyane Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Motloheloa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58082276',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mahooana',
  'Mahooana Wool and Mohair Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha- Mosalla' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58727127',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Pig masters',
  'Pig Masters',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Liile' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62012111',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='milling'),
  'Karabo',
  'Karabo Agri Business',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Koro-Koro' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63134356',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'not_needed',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Pitso',
  'Pitso Farms',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kubake Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Setleketseng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63093749',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'J&P',
  'J&P Letsela Diversified',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mosalla' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59110131',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'Mara',
  'Mara Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Motloheloa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63016346/50144282',
  'nthuseng kahlolo',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Dek',
  'Dek General Supplies',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Leqele' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58932454/56537707',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Ramakoatla',
  'Ramakoatla Greatest farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  NULL,
  NULL,
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Ailam',
  'Ailam Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Nazareth' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63168480',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'B&M',
  'B&M Agri Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='St- Michael' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63656977',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Croco',
  'Croco Agri Group Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='St- Michael' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58738294',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Freeway',
  'Freeway Group of Companies',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha- Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63065109',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Masotsa',
  'Masotsa Group of Companies',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoalipana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Semonkong' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Semokong, Ha Samuel' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53304999',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Seeqela',
  'Seeqela Valley Farms',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Motanyane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58430344',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Shines',
  'Shines Farming',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Motloheloa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '68000074',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Project Mng',
  'Project Management and Services Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='St- Michael' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62444371',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Cornel',
  'Cornel Bright',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mafikaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62008642',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Katleho',
  'Katleho Ea Basali Association',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Hasofonea' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53819911',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Joseph Miller',
  'Joseph''s Miller Pty',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Makhaothi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '68211133/63500881',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Dibu',
  'Dibu Farm Field Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Phahameng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63636683/63046861',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Tsoso',
  'Tsoso''s Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63694470',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'C-shine',
  'C-Shine Holdings',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Senekane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  NULL,
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='livestock_production'),
  'Thabang',
  'Thabang Farm Centre',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  NULL,
  NULL,
  '58001613',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Nthunya',
  'Nthunya Enterprise Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Matsieng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62333111',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mahlasela',
  'Mahlasela Investment Group',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ramabanta' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Nyakosoba' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59080106',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Dismalink',
  'Dismalink Holdings Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Tsunyane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53393924',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='fish_production'),
  'Jehonour',
  'Jehonour Holdings',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Likolobeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Setibing' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  'tsieng',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'not_needed',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Mantso',
  'Mantso Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mafefooane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57828375',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Rahabs',
  'Rahabs Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thaba-Bosiu' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53160681',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Basotho Bigg',
  'Basotho Biggest Braai Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Teko' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58843931',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Sekoting',
  'Sekoting Original Farming',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Molengoana' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '51409822',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Greenfield',
  'Green Field Legacy Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Ratau' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58845405',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mission possible',
  'Mission Possible Agric Solution',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Metolong' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63300507',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Fresh vision',
  'Fresh Vision Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Makhoathi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58904354',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='hatchery'),
  'Green valley',
  'Green Valley Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  NULL,
  NULL,
  NULL,
  '58012397',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mantebo',
  'Mantebo Farming Production Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Lilala Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Haramorakane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59937485/62508916',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Next group',
  'Next Group Limited',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Lilala Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Tlhakanelo' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '69124885',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Motete',
  'Motete Group of Companies',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Likolobeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Marakabei' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Jorotane, Ha Nyakane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '50549200',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Makopano',
  'Makopano Farm Produce',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thaba Chitja' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58091938/51653747',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mabung Poultry Farm',
  'Mabung Poultry Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Takalimane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58883315',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Feather Farm Pty Ltd',
  'Feather Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kubake Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mantsebo' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57867033/56293439',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Achivers Pty Ltd',
  'Achivers Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Paki' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58975965/50920117',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'Thomo Agriculture',
  'Thomo Agriculture',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mazenod' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62870780',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Blom Smart Secure Solutions Pty Ltd',
  'Blom Smart Secure Solutions Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Masana' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58817349',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Molete Veggies',
  'Molete Veggies',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mohasoa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53903739',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Queenslink',
  'Queenslink Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mohlaka oa tuka' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58554888',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'done_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='meat_processing'),
  'Meat and deli',
  'Meat & Deli',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58748375',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  '2L',
  '2L Farm Enterprise Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  NULL,
  NULL,
  (SELECT id FROM public.villages WHERE name='Ha Teko' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '56625603',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Evowen',
  'Evowen Agri Enterprise',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Lenono' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58975583',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='milling'),
  'Avails',
  'Avails Operations Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Makhalayane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58038643',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Legacy',
  'Green Field Legacy Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Ratau' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58845405',
  'Likeleli Majoro',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'City farm',
  'City Farm and Feedlot Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Abia' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63131787/58014688',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Hlotsi',
  'Hlotsi Fresh Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53380157',
  NULL,
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Joy',
  'Joy Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Bosofo' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59343361',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Makhoathi',
  'Makhoathi Agriculture Development Association',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Makhoathi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63500881',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'not_needed',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Maphothoane',
  'Maphothoane Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Lithabaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '51797440',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Metolong',
  'Metolong',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Makhale' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58880726',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'Plateau',
  'Plateau Agri Farms',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thaba-bosiu' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58847195',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Sekoala',
  'Sekoala Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Motloheloa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62050069/63095579',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Rafatse',
  'Rafatse Merino',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thaba-bosiu' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59969211',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='meat_processing'),
  'The past',
  'The Past Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mookoli' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59129687',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'not_needed',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Mteekay',
  'Mteekay',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mohoasoa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62409172',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='meat_processing'),
  'Mofoka',
  'Mofoka Farm Feeds and Animal Production',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mofoka' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58855153',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'not_needed',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'TM Agri',
  'TM Agriculture',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mofoka' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '68511988',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='milling'),
  'Smooth operators',
  'Smooth Operators Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Phaloane' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57916637/58869067',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Mphu',
  'Mphu Trading',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Metolong Ha-Makotoko' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59918424',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Just food',
  'Just Food Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='lehlakaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57033073/62850277',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Mahamo Family Fortune',
  'Mahamo Family Fortune',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mosalla' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58774483',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'in_progress',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Oasis Inc Pty Ltd',
  'Oasis Inc Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Teko' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58415102',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Hae Ha Moima Far Productions Pty Ltd',
  'Hae Ha Moima Far Productions Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kubake Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Moima' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59626525',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'in_progress',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Boitumelo Agriculture',
  'Boitumelo Agriculture',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57572622/57886237',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'LLQ',
  'LLQ Brothers Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Machekoaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62084933',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'in_progress',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Malataliana Holdings',
  'Malataliana Holdings',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-lenono' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58884401',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Chick Chateau',
  'Chick Chateau',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58072341',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'City of Grace Park Pty Ltd',
  'City of Grace Park Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mants''ebo' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62322792',
  'Mpolokeng Motanyane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='meat_processing'),
  'Bohlale Piggery',
  'Bohlale Piggery',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Maja' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57299394',
  'Senate Mpaki',
  'completed_in_app',
  'done',
  'in_progress',
  'done_submitted',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Rangers Farm',
  'Rangers Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Teko' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58514131',
  'Nthuseng Kahlolo',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Ratau 02 Community Development',
  'Ratau 02 Community Development',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Metolong-Rahachele' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58035999/59107107',
  'Makhauta Makhetha',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Brownie Farm Feeds',
  'Brownie Farm Feeds',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Haleutsoa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '50792278',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Cropwise Solutions Pty Ltd',
  'Cropwise Solutions Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mosalla' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62584842',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Leboea Golden Gardens',
  'Leboea Golden Gardens',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Motloheloa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58905963',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Alma Holdings Pty Ltd',
  'Alma Holdings Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Boinyatso' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62077444',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Kabi Farm Produce',
  'Kabi Farm Produce',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thaba-Khupa' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58717037',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Masehle Farms Pty Ltd',
  'Masehle Farms Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Majara' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58575721',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'in_progress',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Raliete Agricultural Imputs & farm Products',
  'Raliete Agricultural Imputs & farm Products',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  NULL,
  (SELECT id FROM public.villages WHERE name='Moeaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58667951/51485681',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Mein Kiiys Brokers',
  'Mein Kiiys Brokers',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Manonyane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Boinyatso' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58708801',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Elmercy Poultry Farm Pty Ltd',
  'Elmercy Poultry Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kubake Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ramabanta' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Moitsupeli' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58999836',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Nyane Vegetable Farm Pty Ltd',
  'Nyane Vegetable Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Maja' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59222045',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='meat_processing'),
  'PBL  Farm Products',
  'PBL Farm Products',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Lower Thamae' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59797760',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'in_progress',
  'done_submitted',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Hanes Enterprise Pty Ltd',
  'Hanes Enterprise Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mantsebo, Temaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58855551',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Shinny Hands Farm Produce',
  'Shinny Hands Farm Produce',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Masowe' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63065486',
  'Mamello Masita',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Mohlerepe Piggery',
  'Mohlerepe Piggery',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mokema' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '50007332',
  'Marealeboha Mokhosi',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Franc Farm',
  'Franc Farm',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Qiloane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Mpesi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53379972',
  'Malika Tsoeliane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Figs Pty Ltd',
  'Figs Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mazenod Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha-Masana' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58441175',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Kori Farming Services',
  'Kori Farming Services',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kubake Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Setleketseng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58083132',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Molekane Culture Pty Ltd',
  'Molekane Culture Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makhoarane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Morija' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mahloenyeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62139504',
  'Khosi Matsoso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'MPK Farming Pty Ltd',
  'MPK Farming Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Mohlakeng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Masianokeng' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Foto mokema' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58038643/63759563',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='fruit_drying'),
  'LFT Beekeepers Machache Pty Ltd',
  'LFT Beekeepers Machache Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Ratau Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Ntsi' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Nazereth ha mosiu' AND district_id=(SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59368873',
  'Sebabatso Sents''o Lesole',
  'completed_in_app',
  'done',
  'in_progress',
  'not_started',
  'unknown',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Khanya',
  'Khanya Family Enterprises Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Maseru' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  NULL,
  NULL,
  NULL,
  '50489399',
  NULL,
  'pending_app_completion',
  'in_progress',
  'in_progress',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Rising Star',
  'The Rising Star Farm',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Tenesolo Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mantsonyane' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Malihase' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58036623',
  'Keketso Motsie',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Mankoaneng',
  'Mankoaneng All Together Merino Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Litsoetsoe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Lilala' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Rantsimane' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59867349',
  'Keletso Tumane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Basia',
  'Basia Poultry Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Litsoetsoe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mohlanapeng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Linokong' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58504377',
  'Keletso Tumane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Lijane and sons',
  'Lijane & Sons Ram Breeder Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Litsoetsoe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mohlanapeng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Nakeli' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59131891',
  'K''hoetha Khemane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_buck_breeding'),
  'Mokhoabong',
  'Mokhoabong Farm',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Litsoetsoe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mohlanapeng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mohlanapeng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58840404-56674762',
  'K''hoetha Khemane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Ntaote',
  'Ntaote Agri Ltd',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Thaba-Tseka Urban Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Lilala' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Liphokoaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58888488',
  'K''hoetha Khemane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'not_needed',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Ora',
  'Ora Farms',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Thaba-Tseka Urban Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Lilala' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Phomolong' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57747155',
  'K''hoetha Khemane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Seforong',
  'Seforong Holding Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Litsoetsoe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mohlanapeng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Ramalapi' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63083028-59369002',
  'K''hoetha Khemane',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Goshen',
  'Goshen Tradings Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Bokong Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Lilala' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Khoanyane' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '56549169',
  'Keketso Motsie',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'not_drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Nona',
  'Nona Piggery And Broiler Holdings',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Thaba-Tseka Urban Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Lilala' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thabong1' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58889266',
  'Keketso Motsie',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'PP Crocodile',
  'PP Crocodile',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Tenesolo Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mantsonyane' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Muso' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62451145',
  'Keketso Motsie',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'not_drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Makhele',
  'Makhele Farm and Trading Company',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Thaba-Tseka Urban Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Lilala' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Liphokoaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63113411',
  'Keketso Motsie',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'Thipe',
  'Thipe Farming',
  (SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Tenesolo Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mantsonyane' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Toka' AND district_id=(SELECT id FROM public.districts WHERE name='Thaba-Tseka' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63170367',
  'Keletso Tumane',
  'completed_in_app',
  'done',
  'in_progress',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Hansen',
  'Hansen',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Senekane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62036606',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'VEL',
  'Mohale''s Farming Development Projects',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Teyateyaneng Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Teyateyaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Mphele' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59805786',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Total trust',
  'Total Trust Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Motanasela Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '69194671',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Qaleho',
  'Qaleho Holdings',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Senekane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Ralimo' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '64044981',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Snow Group',
  'Snow Group',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58560286',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'MBO',
  'Mbo-MK business solution',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sekamaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58900322',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Masutsa',
  'Masutsa Farm Producers',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '56414221',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Bkaak',
  'Bkaakfarm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sekamaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '56107201',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'submitted',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Koeneng Farm Fresh',
  'Koeneng Farm Fresh',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Phuthiatsana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Teyateyaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Haphoofolo' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58883368',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mohale''s Farming Development Projects',
  'Mohale''s Farming Development Projects',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Teyateyaneng Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Teyateyaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Mphele' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59805786',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_not_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Chota Masters',
  'Chota Masters',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Palace' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63665512',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Tlhabeli Majoro Farm',
  'Tlhabeli Majoro Farm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Motanasela Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Ramothamo' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '56942099',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'The Great Farmer Pty Ltd',
  'The Great Farmer Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sekamaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62000227',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Kepo Agri',
  'Kepo Agri',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Phuthiatsana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Teyateyaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Mosethe' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '56003637',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'Loli',
  'Loli',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sekamaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62000227',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Octagon',
  'Octagon',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Berea Mission' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58467401',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Map City Smart Agro',
  'Map City Smart Agro',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Mokhethoaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '64057503',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Hlephole agri Business',
  'Hlephole agri Business',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Teyateyaneng Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Teyateyaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Lekokoaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62099777',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Snowy Veggies',
  'Snowy Veggies',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sekamaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58722291',
  'Thakane Tsiame',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Malebaea Peter and his Family',
  'Malebaea Peter and his Family',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Tebe-tebe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Pilot' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Thupa Kubu' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62739238',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='ram_breeding'),
  'KT Enterprise Pty Ltd',
  'KT Enterprise Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Makeoane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mapoteng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Jorotane' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '5881106',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Thaba-Lifika Farm',
  'Thaba-Lifika Farm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Tebe-tebe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Pilot' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sefikaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58106979',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Magnetic farm',
  'Magnetic farm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Tebe-tebe Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Pilot' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Matjotjo' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63988577/56941474',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'R & J Delight Pty Ltd',
  'R & J Delight Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Senekane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53549686',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Ratsiu Agro Farm',
  'Ratsiu Agro Farm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Teyateyaneng Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Teyateyaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Ratsiu' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58055558',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Lebese Farm Suppliers',
  'Lebese Farm Suppliers',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Senekane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '50224777',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='dairy_production'),
  'AKK Mohasula',
  'AKK Mohasula',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Sekamaneng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62920250',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Lifeline Intergrated',
  'Lifeline Intergrated',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Senekane Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Sefikeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha malei' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '53257100',
  'Tsebo Moteetee',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Mothabi Piggery',
  'Mothabi Piggery',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kueneng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Corn Exchange' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Kolojane ha lestsoela' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58789020',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Letsoara Poultry',
  'Letsoara Poultry',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kueneng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Corn Exchange' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Baking' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '59732167',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'L.Masenye Poultry Farm',
  'L.Masenye Poultry Farm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kueneng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Corn Exchange' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Bela Bela' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62455744',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Supergood',
  'Supergood',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kueneng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Corn Exchange' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Kolojane ha lestsoela' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '57644224',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Lekhoakhoa farms',
  'Lekhoakhoa farms',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  NULL,
  NULL,
  NULL,
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'The Lynth Fresh Produce Pty Ltd',
  'The Lynth Fresh Produce Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  NULL,
  NULL,
  (SELECT id FROM public.villages WHERE name='Sehlabeng pela sekolo sa machina' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58665179',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Caledon View Farming',
  'Caledon View Farming',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Lekokoaneng ha fusi' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58075020',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Fresh Mountain Asparagus Pty Ltd',
  'Fresh Mountain Asparagus Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Makebe' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58850022',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Sammy',
  'Sammy',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Berea Hills' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58742267',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Maqalika Agric farm Project',
  'Maqalika Agric farm Project',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Khubetsoana' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58713078',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Mamorena & TM Poultry',
  'Mamorena & TM Poultry',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  NULL,
  NULL,
  (SELECT id FROM public.villages WHERE name='Sehlabeng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '63219190',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'TKL Farm Production',
  'TKL Farm Production',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Palace' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62002542',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='egg_production'),
  'Qotha Farms Pty Ltd',
  'Qotha Farms Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kubake Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Koalabata' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58740871',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Pemora Agric Solution',
  'Pemora Agric Solution',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Khubetsoana' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62852444',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Amazing Grace',
  'Amazing Grace',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Seqonoka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58731177/63075703',
  'Mpho Mapitse',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Mrs Chicken Pty Ltd',
  'Mrs Chicken Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Maseru Urban Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Mabote' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62025772',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'done_submitted',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Anns Poultry Farm',
  'Anns Poultry Farm',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha -Bua-Sono' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '62665584',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Emely Farm Pty Ltd',
  'Emely Farm Pty Ltd',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kueneng Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Mapoteng' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Ha Hlajoane lithakong' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '65003248',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='vegetable_production'),
  'Global Agricultural Produce',
  'Global Agricultural Produce',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Berea Mission' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '50069116',
  'Morero Putsoa',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='piggery'),
  'Mpela Motloli',
  'Mpela Motloli',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Berea' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58100223',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'pre_existing',
  'minimal'
);

INSERT INTO public.enterprises (
  organization_id, round_id, enterprise_type_id,
  beneficiary_short_name, applicant_organisation_name,
  district_id, community_council_id, resource_center_id, village_id,
  beneficiary_contact_phone, service_provider_name,
  esmp_status, procurement_plan_status, business_plan_status,
  milestone1_report_status, drilling_status,
  registration_completeness
) VALUES (
  (SELECT id FROM public.organizations WHERE code='4D'),
  3,
  (SELECT id FROM public.enterprise_types WHERE code='broiler_production'),
  'Leribe Green Farming',
  'Leribe Green Farming',
  (SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D')),
  (SELECT id FROM public.community_councils WHERE name='Kanana Community Council' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.resource_centers WHERE name='Maqhaka' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  (SELECT id FROM public.villages WHERE name='Berea Hills' AND district_id=(SELECT id FROM public.districts WHERE name='Berea' AND organization_id=(SELECT id FROM public.organizations WHERE code='4D'))),
  '58740938',
  'Puleng Mokhethea Khotso',
  'completed_in_app',
  'done',
  'done_to_be_validated',
  'not_started',
  'drilled',
  'minimal'
);


-- ============================================================================
-- Verify
-- ============================================================================
SELECT
  (SELECT count(*) FROM public.enterprises WHERE organization_id=(SELECT id FROM public.organizations WHERE code='4D')) AS total_4d_enterprises,
  (SELECT count(*) FROM public.enterprises WHERE esmp_status='completed_in_app') AS esmp_done,
  (SELECT count(*) FROM public.enterprises WHERE procurement_plan_status='done') AS proc_done,
  (SELECT count(*) FROM public.enterprises WHERE milestone1_report_status='done_submitted') AS m1_submitted,
  (SELECT count(*) FROM public.enterprises WHERE drilling_status='drilled') AS drilled,
  (SELECT count(*) FROM public.enterprises WHERE drilling_status='pre_existing') AS pre_existing_borehole;

-- Counts by district
SELECT d.name AS district, count(e.*) AS enterprises
  FROM public.districts d
  LEFT JOIN public.enterprises e ON e.district_id = d.id
 WHERE d.organization_id = (SELECT id FROM public.organizations WHERE code='4D')
 GROUP BY d.name ORDER BY d.name;
-- expected: Berea 50, Maseru 102, Thaba-Tseka 13

-- Rows with NULL enterprise_type_id (need attention via admin UI)
SELECT beneficiary_short_name, (SELECT name FROM public.districts WHERE id = e.district_id) AS district
  FROM public.enterprises e
 WHERE enterprise_type_id IS NULL
 ORDER BY district, beneficiary_short_name;
