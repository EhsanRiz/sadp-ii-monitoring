import json

schemas = json.load(open('/tmp/esmp_schemas.json'))

MAPPING = {
    'ESMP - BEE KEEPING (Ver. 2).docx':                              ('emmp_bee_keeping_v2',      [18]),
    'ESMP - DAIRY (Ver. 2).docx':                                    ('emmp_dairy_v2',            [9]),
    'ESMP - FRUIT & VEGETABLE DRYING (Ver. 2).docx':                 ('emmp_fruit_veg_drying_v2', [15, 16]),
    'ESMP - FRUIT JUICE MAKING (Ver. 2).docx':                       ('emmp_fruit_juice_v2',      [21]),
    'ESMP - MEAT DRYING (Ver. 2).docx':                              ('emmp_meat_drying_v2',      [20]),
    'ESMP - MILLING OPERATIONS (Ver. 1).docx':                       ('emmp_milling_v1',          [17]),
    'ESMP - PIGGERY (Ver. 2).docx':                                  ('emmp_piggery_v2',          [8]),
    'ESMP - POULTRY (Ver. 2).docx':                                  ('emmp_poultry_v2',          [4, 5, 6, 7]),
    'ESMP - RABBIT PRODUCTION (Ver. 1).docx':                        ('emmp_rabbit_v1',           [19]),
    'ESMP - SLAUGHTER FACILITIES (Ver. 2).docx':                     ('emmp_slaughter_v2',        [14]),
    'ESMP - VEGETABLE PRODUCTION - SHEDNETS, GREENHOUSES (Ver. 2).docx': ('emmp_vegetable_shednets_v2', [1, 2, 3]),
    'ESMP - WOOL AND MOHAIR PRODUCTION (Ver. 2).docx':               ('emmp_wool_mohair_v2',      [10, 11, 12]),
}

assert len(MAPPING) == 12

lines = ["-- 12 EMMP templates seed", ""]
for filename in sorted(MAPPING):
    if filename not in schemas:
        print(f"WARN: parsed schema missing for {filename}")
        continue
    sch  = schemas[filename]
    tid, type_ids = MAPPING[filename]
    title   = sch['title'].replace("'", "''")
    version = sch['version'].replace("'", "''")
    sj      = json.dumps(sch, ensure_ascii=False).replace("'", "''")
    lines.append(f"INSERT INTO public.emmp_templates (id, enterprise_type_ids, title, version, schema)")
    lines.append(f"VALUES ('{tid}', ARRAY{type_ids}::smallint[], '{title}', '{version}', '{sj}'::jsonb)")
    lines.append(f"ON CONFLICT (id) DO UPDATE SET enterprise_type_ids = EXCLUDED.enterprise_type_ids, title = EXCLUDED.title, version = EXCLUDED.version, schema = EXCLUDED.schema;")
    lines.append("")

with open('/tmp/seed_emmp.sql', 'w') as fh:
    fh.write('\n'.join(lines))
print(f"Wrote /tmp/seed_emmp.sql: {sum(1 for l in lines if l.startswith('INSERT'))} INSERTs")
