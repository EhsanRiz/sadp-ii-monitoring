-- Adds 3.4 Climate Change row to the Vegetable Production: Shed Nets / Greenhouses
-- EMMP template. Mirrors the row visible on the printed reference template
-- (Page 10 of ESMP_MAQALIKA_AGRIFARM_sample.pdf). Initial impacts /
-- mitigations / monitoring items are sensible defaults for Lesotho
-- highlands vegetable production; SADP-II HQ can refine them in a future
-- migration without changing the row id.
UPDATE emmp_templates
SET schema = jsonb_set(
  schema,
  '{sections,2,rows}',
  (schema->'sections'->2->'rows') || jsonb_build_array(
    jsonb_build_object(
      'id', '3.4.r6',
      'activity_id', '3.4',
      'activity', '3.4 Climate Change',
      'impacts', jsonb_build_array(
        jsonb_build_object('id', '3.4.r6.i1', 'label', 'Damage to shed nets / greenhouse structures from extreme weather events (heavy rain, hail, strong winds)'),
        jsonb_build_object('id', '3.4.r6.i2', 'label', 'Heat stress on crops reducing yields and quality'),
        jsonb_build_object('id', '3.4.r6.i3', 'label', 'Increased water demand and irrigation requirements due to higher temperatures'),
        jsonb_build_object('id', '3.4.r6.i4', 'label', 'Increased pest and disease pressure from shifting temperature and humidity regimes'),
        jsonb_build_object('id', '3.4.r6.i5', 'label', 'Reduced water availability during prolonged dry spells')
      ),
      'mitigations', jsonb_build_array(
        jsonb_build_object('id', '3.4.r6.m1', 'label', 'Use reinforced shed net / greenhouse structures designed for local climate extremes'),
        jsonb_build_object('id', '3.4.r6.m2', 'label', 'Install rainwater harvesting and water storage for irrigation'),
        jsonb_build_object('id', '3.4.r6.m3', 'label', 'Apply shade nets and ventilation for heat and humidity management'),
        jsonb_build_object('id', '3.4.r6.m4', 'label', 'Adopt climate-tolerant and drought-resistant crop varieties'),
        jsonb_build_object('id', '3.4.r6.m5', 'label', 'Practice crop rotation and integrated pest management'),
        jsonb_build_object('id', '3.4.r6.m6', 'label', 'Mulching and soil cover practices to retain soil moisture')
      ),
      'monitoring', jsonb_build_array(
        jsonb_build_object('id', '3.4.r6.p1', 'label', 'Number of damage incidents from extreme weather events'),
        jsonb_build_object('id', '3.4.r6.p2', 'label', 'Crop yield variability against baseline'),
        jsonb_build_object('id', '3.4.r6.p3', 'label', 'Water consumption and rainfall harvested (litres)'),
        jsonb_build_object('id', '3.4.r6.p4', 'label', 'Pest and disease incidence reports')
      ),
      'default_person_implement', NULL,
      'default_person_monitor', NULL,
      'default_timeframe', NULL
    )
  )
)
WHERE id = 'emmp_vegetable_shednets_v2';
