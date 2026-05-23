-- 130_seed_enterprise_types.sql
-- The 17 enterprise types observed in real 4D data, grouped into 4 categories
-- that drive Phase 2 ESMP template routing.

INSERT INTO public.enterprise_types (id, code, name, category) VALUES
  -- crops
  ( 1, 'vegetable_production', 'Vegetable Production', 'crops'),
  ( 2, 'hydroponics',          'Hydroponics',          'crops'),
  ( 3, 'seedling_production',  'Seedling Production',  'crops'),

  -- livestock
  ( 4, 'broiler_production',   'Broiler Production',   'livestock'),
  ( 5, 'egg_production',       'Egg Production',       'livestock'),
  ( 6, 'hatchery',             'Hatchery',             'livestock'),
  ( 7, 'duck_production',      'Duck Production',      'livestock'),
  ( 8, 'piggery',              'Piggery',              'livestock'),
  ( 9, 'dairy_production',     'Dairy Production',     'livestock'),
  (10, 'ram_breeding',         'Ram Breeding',         'livestock'),
  (11, 'ram_buck_breeding',    'Ram & Buck Breeding',  'livestock'),
  (12, 'livestock_production', 'Livestock Production', 'livestock'),

  -- aquaculture
  (13, 'fish_production',      'Fish Production',      'aquaculture'),

  -- processing
  (14, 'meat_processing',      'Meat Processing',      'processing'),
  (15, 'fruit_drying',         'Fruit Drying',         'processing'),
  (16, 'fruit_veg_processing', 'Fruit & Vegetable Processing', 'processing'),
  (17, 'milling',              'Milling',              'processing')
ON CONFLICT (id) DO NOTHING;
