-- 4D catalog load: 3 districts, 27 CCs, 17 RCs, 140 villages

-- 0. Clean up the erroneous 'Quthing' row (keep 'Quithing')
DELETE FROM public.districts
 WHERE name = 'Quthing'
   AND organization_id = (SELECT id FROM public.organizations WHERE code='RSDA');

-- 1. Insert 4D districts
INSERT INTO public.districts (organization_id, name)
SELECT (SELECT id FROM public.organizations WHERE code='4D'), d
  FROM (VALUES
    ('Berea'),
      ('Maseru'),
      ('Thaba-Tseka')
  ) AS t(d)
ON CONFLICT (organization_id, name) DO NOTHING;

-- community_councils
WITH d4d AS (
  SELECT d.id, d.name FROM public.districts d
    JOIN public.organizations o ON o.id = d.organization_id
   WHERE o.code = '4D'
)
INSERT INTO public.community_councils (district_id, name)
SELECT d.id, v.cc
  FROM (VALUES
    ('Berea', 'Kanana Community Council'),
      ('Berea', 'Kubake Community Council'),
      ('Berea', 'Kueneng Community Council'),
      ('Berea', 'Makeoane Community Council'),
      ('Berea', 'Maseru Urban Council'),
      ('Berea', 'Motanasela Community Council'),
      ('Berea', 'Phuthiatsana Community Council'),
      ('Berea', 'Senekane Community Council'),
      ('Berea', 'Tebe-tebe Community Council'),
      ('Berea', 'Teyateyaneng Urban Council'),
      ('Maseru', 'Kubake Community Council'),
      ('Maseru', 'Likolobeng Community Council'),
      ('Maseru', 'Lilala Community Council'),
      ('Maseru', 'Makhoalipana Community Council'),
      ('Maseru', 'Makhoarane Community Council'),
      ('Maseru', 'Manonyane Community Council'),
      ('Maseru', 'Maseru Urban Council'),
      ('Maseru', 'Mazenod Community Council'),
      ('Maseru', 'Mohlakeng Community Council'),
      ('Maseru', 'Qiloane Community Council'),
      ('Maseru', 'Ratau Community Council'),
      ('Maseru', 'Senekane Community Council'),
      ('Thaba-Tseka', 'Bokong Community Council'),
      ('Thaba-Tseka', 'Linakeng Community Council'),
      ('Thaba-Tseka', 'Litsoetsoe Community Council'),
      ('Thaba-Tseka', 'Tenesolo Community Council'),
      ('Thaba-Tseka', 'Thaba-Tseka Urban Community Council')
  ) AS v(dist, cc)
  JOIN d4d d ON d.name = v.dist
ON CONFLICT (district_id, name) DO NOTHING;

-- resource_centers
WITH d4d AS (
  SELECT d.id, d.name FROM public.districts d
    JOIN public.organizations o ON o.id = d.organization_id
   WHERE o.code = '4D'
)
INSERT INTO public.resource_centers (district_id, name)
SELECT d.id, v.rc
  FROM (VALUES
    ('Berea', 'Corn Exchange'),
      ('Berea', 'Mapoteng'),
      ('Berea', 'Maqhaka'),
      ('Berea', 'Pilot'),
      ('Berea', 'Sefikeng'),
      ('Berea', 'Teyateyaneng'),
      ('Maseru', 'Marakabei'),
      ('Maseru', 'Masianokeng'),
      ('Maseru', 'Morija'),
      ('Maseru', 'Ntsi'),
      ('Maseru', 'Ramabanta'),
      ('Maseru', 'Rothe'),
      ('Maseru', 'Sefikeng'),
      ('Maseru', 'Semonkong'),
      ('Thaba-Tseka', 'Lilala'),
      ('Thaba-Tseka', 'Mantsonyane'),
      ('Thaba-Tseka', 'Mohlanapeng')
  ) AS v(dist, rc)
  JOIN d4d d ON d.name = v.dist
ON CONFLICT (district_id, name) DO NOTHING;

-- villages
WITH d4d AS (
  SELECT d.id, d.name FROM public.districts d
    JOIN public.organizations o ON o.id = d.organization_id
   WHERE o.code = '4D'
)
INSERT INTO public.villages (district_id, name)
SELECT d.id, v.village
  FROM (VALUES
    ('Berea', 'Baking'),
      ('Berea', 'Bela Bela'),
      ('Berea', 'Berea'),
      ('Berea', 'Berea Hills'),
      ('Berea', 'Berea Mission'),
      ('Berea', 'Cana'),
      ('Berea', 'Ha -Bua-Sono'),
      ('Berea', 'Ha Hlajoane lithakong'),
      ('Berea', 'Ha Mabote'),
      ('Berea', 'Ha Makebe'),
      ('Berea', 'Ha Matjotjo'),
      ('Berea', 'Ha Mokhathi'),
      ('Berea', 'Ha Mosethe'),
      ('Berea', 'Ha Mphele'),
      ('Berea', 'Ha Ralimo'),
      ('Berea', 'Ha Ramothamo'),
      ('Berea', 'Ha Ratsiu'),
      ('Berea', 'Ha malei'),
      ('Berea', 'Haphoofolo'),
      ('Berea', 'Jorotane'),
      ('Berea', 'Khubetsoana'),
      ('Berea', 'Koalabata'),
      ('Berea', 'Kolojane ha lestsoela'),
      ('Berea', 'Lecoop'),
      ('Berea', 'Lekokoaneng'),
      ('Berea', 'Lekokoaneng ha fusi'),
      ('Berea', 'Makola'),
      ('Berea', 'Mineworkers'),
      ('Berea', 'Mokhethoaneng'),
      ('Berea', 'Palace'),
      ('Berea', 'Sefikaneng'),
      ('Berea', 'Sehlabeng'),
      ('Berea', 'Sehlabeng pela sekolo sa machina'),
      ('Berea', 'Sekamaneng'),
      ('Berea', 'Seqonoka'),
      ('Berea', 'Thuathe ha ralimo'),
      ('Berea', 'Thupa Kubu'),
      ('Berea', 'sehlabeng'),
      ('Maseru', 'Boinyatso'),
      ('Maseru', 'Bosofo'),
      ('Maseru', 'Ha Abia'),
      ('Maseru', 'Ha Foto mokema'),
      ('Maseru', 'Ha Leqele'),
      ('Maseru', 'Ha Majara'),
      ('Maseru', 'Ha Makhaothi'),
      ('Maseru', 'Ha Makhoathi'),
      ('Maseru', 'Ha Motemekoane'),
      ('Maseru', 'Ha Motloheloa'),
      ('Maseru', 'Ha Nelese'),
      ('Maseru', 'Ha Ntsi'),
      ('Maseru', 'Ha Paki'),
      ('Maseru', 'Ha Phaloane'),
      ('Maseru', 'Ha Phohleli'),
      ('Maseru', 'Ha Teko'),
      ('Maseru', 'Ha Tlhakanelo'),
      ('Maseru', 'Ha- Mosalla'),
      ('Maseru', 'Ha- Ntsi'),
      ('Maseru', 'Ha-Lenono'),
      ('Maseru', 'Ha-Liile'),
      ('Maseru', 'Ha-Mafefooane'),
      ('Maseru', 'Ha-Maja'),
      ('Maseru', 'Ha-Makhale'),
      ('Maseru', 'Ha-Mants''ebo'),
      ('Maseru', 'Ha-Mantsebo'),
      ('Maseru', 'Ha-Mantsebo, Temaneng'),
      ('Maseru', 'Ha-Masana'),
      ('Maseru', 'Ha-Mofoka'),
      ('Maseru', 'Ha-Mohasoa'),
      ('Maseru', 'Ha-Mohoasoa'),
      ('Maseru', 'Ha-Moima'),
      ('Maseru', 'Ha-Moitsupeli'),
      ('Maseru', 'Ha-Molengoana'),
      ('Maseru', 'Ha-Mosalla'),
      ('Maseru', 'Ha-Motanyane'),
      ('Maseru', 'Ha-Motlohela'),
      ('Maseru', 'Ha-Motloheloa'),
      ('Maseru', 'Ha-Mpesi'),
      ('Maseru', 'Ha-Nqheku'),
      ('Maseru', 'Ha-Ratau'),
      ('Maseru', 'Ha-Takalimane'),
      ('Maseru', 'Ha-Teko'),
      ('Maseru', 'Ha-Tsunyane'),
      ('Maseru', 'Ha-lenono'),
      ('Maseru', 'Ha-ntsi'),
      ('Maseru', 'Haleutsoa'),
      ('Maseru', 'Hamofoka'),
      ('Maseru', 'Haramorakane'),
      ('Maseru', 'Hasofonea'),
      ('Maseru', 'Jorotane, Ha Nyakane'),
      ('Maseru', 'Koro-Koro'),
      ('Maseru', 'Lithabaneng'),
      ('Maseru', 'Lower Thamae'),
      ('Maseru', 'Machekoaneng'),
      ('Maseru', 'Mafikaneng'),
      ('Maseru', 'Mahloenyeng'),
      ('Maseru', 'Makhalayane'),
      ('Maseru', 'Makhoathi'),
      ('Maseru', 'Masekoeng'),
      ('Maseru', 'Masite Ha Rasekoai'),
      ('Maseru', 'Masowe'),
      ('Maseru', 'Matsieng'),
      ('Maseru', 'Matukeng'),
      ('Maseru', 'Mazenod'),
      ('Maseru', 'Metolong'),
      ('Maseru', 'Metolong Ha-Makotoko'),
      ('Maseru', 'Metolong-Rahachele'),
      ('Maseru', 'Moeaneng'),
      ('Maseru', 'Mohlaka oa tuka'),
      ('Maseru', 'Mokema'),
      ('Maseru', 'Mookoli'),
      ('Maseru', 'Morija'),
      ('Maseru', 'Nazareth'),
      ('Maseru', 'Nazereth ha mosiu'),
      ('Maseru', 'Nyakosoba'),
      ('Maseru', 'Phahameng'),
      ('Maseru', 'Roma'),
      ('Maseru', 'Rothe Ha Malebo'),
      ('Maseru', 'Sehlabeng'),
      ('Maseru', 'Semokong, Ha Samuel'),
      ('Maseru', 'Setibing'),
      ('Maseru', 'Setleketseng'),
      ('Maseru', 'St- Michael'),
      ('Maseru', 'Thaba Chitja'),
      ('Maseru', 'Thaba-Bosiu'),
      ('Maseru', 'Thaba-Khupa'),
      ('Maseru', 'Thaba-bosiu'),
      ('Maseru', 'lehlakaneng'),
      ('Thaba-Tseka', 'Ha Khoanyane'),
      ('Thaba-Tseka', 'Ha Muso'),
      ('Thaba-Tseka', 'Ha Nakeli'),
      ('Thaba-Tseka', 'Ha Ramalapi'),
      ('Thaba-Tseka', 'Ha Rantsimane'),
      ('Thaba-Tseka', 'Ha Shoaepane'),
      ('Thaba-Tseka', 'Ha Toka'),
      ('Thaba-Tseka', 'Linokong'),
      ('Thaba-Tseka', 'Liphokoaneng'),
      ('Thaba-Tseka', 'Malihase'),
      ('Thaba-Tseka', 'Mohlanapeng'),
      ('Thaba-Tseka', 'Phomolong'),
      ('Thaba-Tseka', 'Thabong1')
  ) AS v(dist, village)
  JOIN d4d d ON d.name = v.dist
ON CONFLICT (district_id, name) DO NOTHING;

-- 3. Verify counts
SELECT o.code,
       (SELECT count(*) FROM districts          d WHERE d.organization_id = o.id) AS districts,
       (SELECT count(*) FROM community_councils c WHERE c.organization_id = o.id) AS ccs,
       (SELECT count(*) FROM resource_centers   r WHERE r.organization_id = o.id) AS rcs,
       (SELECT count(*) FROM villages           v WHERE v.organization_id = o.id) AS villages
  FROM public.organizations o
 ORDER BY o.code;
