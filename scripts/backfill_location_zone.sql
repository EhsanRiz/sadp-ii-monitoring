-- Backfill: enterprises.location_detail (all 3 districts) + zone (Maseru only)
-- Generated from SADP_II_Master_Check_List_June_2026.xlsx (Location col E + Zones block).
-- Keyed by enterprise id. Idempotent. 164 enterprises.

BEGIN;
UPDATE public.enterprises SET location_detail='Ha Teko', zone=1 WHERE id='1395f536-323a-427b-b0b2-9fe84be3691f'; -- [Maseru] 2L
UPDATE public.enterprises SET location_detail='Ha Paki', zone=2 WHERE id='599193c6-06e8-405c-b5e6-0aa576ec31e0'; -- [Maseru] Achivers Pty Ltd
UPDATE public.enterprises SET location_detail='Nazareth', zone=8 WHERE id='6cf88d58-ee09-48ef-bcee-e86441c5fd3c'; -- [Maseru] Ailam
UPDATE public.enterprises SET location_detail='Boinyatso', zone=3 WHERE id='a3db7130-e3d6-424b-927c-5f0374e6f1df'; -- [Maseru] Alma Holdings Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Makhalanyane', zone=NULL WHERE id='929fb08e-059b-4edd-8e48-97d5cdfce80c'; -- [Maseru] Avails
UPDATE public.enterprises SET location_detail='ST. Michael', zone=3 WHERE id='b51daa42-3278-4fb8-b99c-7caca7ddf6c2'; -- [Maseru] B&M
UPDATE public.enterprises SET location_detail='Ha Teko', zone=1 WHERE id='36f109e9-1a86-4611-b747-75f272477990'; -- [Maseru] Basotho Bigg
UPDATE public.enterprises SET location_detail='Ha Masana', zone=2 WHERE id='f12c8139-3508-4115-89e3-8e666a716031'; -- [Maseru] Blom Smart Secure Solutions Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Maja', zone=2 WHERE id='22be2f0e-ddb0-468e-bd23-724d680fc0e4'; -- [Maseru] Bohlale Piggery
UPDATE public.enterprises SET location_detail='Morija', zone=1 WHERE id='d11bb924-23d6-4c7d-b87a-a570c16da822'; -- [Maseru] Boitumelo Agriculture
UPDATE public.enterprises SET location_detail='Ha Leutsoa', zone=1 WHERE id='5f644413-8692-456f-8deb-e85fd0bcb8f7'; -- [Maseru] Brownie Farm Feeds
UPDATE public.enterprises SET location_detail='Ha Nqheku', zone=8 WHERE id='dbe3e5c7-cd9f-44ec-a68c-b5b0a328a8d3'; -- [Maseru] Bushman
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='6c6786cb-c8d5-4080-b6fa-fbc5334c2508'; -- [Maseru] C-shine
UPDATE public.enterprises SET location_detail='Ha Ntsi', zone=8 WHERE id='7ff00ef5-8510-4d11-85c8-0890e2af3757'; -- [Maseru] Chick Chateau
UPDATE public.enterprises SET location_detail='Ha Abia', zone=5 WHERE id='410c94b5-26e9-428c-8449-650367f45c68'; -- [Maseru] City farm
UPDATE public.enterprises SET location_detail='Ha Mantsebo', zone=1 WHERE id='20af17ad-99a9-498f-a3df-0973c805a98c'; -- [Maseru] City of Grace Park Pty Ltd
UPDATE public.enterprises SET location_detail='Mafikaneng', zone=5 WHERE id='ea842bdb-24d0-4089-ac53-6dc0a608b559'; -- [Maseru] Cornel
UPDATE public.enterprises SET location_detail='ST. Michael', zone=3 WHERE id='d22ab2fa-31bd-43aa-8398-a5d06afedf1a'; -- [Maseru] Croco
UPDATE public.enterprises SET location_detail='Ha Mosalla', zone=4 WHERE id='fdf941fb-a284-4320-8173-c83042f80e69'; -- [Maseru] Cropwise Solutions Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Leqele', zone=5 WHERE id='740e585e-2dac-47c8-a60f-9e717ebb4614'; -- [Maseru] Dek
UPDATE public.enterprises SET location_detail='Phahameng', zone=NULL WHERE id='d599ae04-8932-4350-9924-853bdd29a7b4'; -- [Maseru] Dibu
UPDATE public.enterprises SET location_detail='Ha Tsunyane', zone=7 WHERE id='bde32084-a7a5-4cae-9e0d-a11a70c3f4a6'; -- [Maseru] Dismalink
UPDATE public.enterprises SET location_detail='Ha Moitsupeli', zone=7 WHERE id='9f508395-339a-41e3-93cd-14986d01da60'; -- [Maseru] Elmercy Poultry Farm Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Lenono', zone=4 WHERE id='137a0ea0-3068-4d6e-8504-690136d7f08a'; -- [Maseru] Evowen
UPDATE public.enterprises SET location_detail='Ha Mantsebo', zone=1 WHERE id='9e332c7e-1ddc-41a1-8ee1-ee2734e987ed'; -- [Maseru] Feather Farm Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Masana', zone=2 WHERE id='753c2870-7d15-42c5-b7cb-4ee938e0df12'; -- [Maseru] Figs Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Mpesi', zone=5 WHERE id='5fbb5d09-7044-4f7b-ad4a-813bdcddc66c'; -- [Maseru] Franc Farm
UPDATE public.enterprises SET location_detail='Ha Ntsi', zone=8 WHERE id='7f64bad3-ae36-43f2-bba8-4b60294566d3'; -- [Maseru] Freeway
UPDATE public.enterprises SET location_detail='Ha Makhoathi', zone=4 WHERE id='1a8c7898-11db-420b-9072-f0575c32e2ed'; -- [Maseru] Fresh vision
UPDATE public.enterprises SET location_detail='Not available', zone=NULL WHERE id='5c0964fe-902b-4316-8d2d-8621607d7b16'; -- [Maseru] Green valley
UPDATE public.enterprises SET location_detail='Ha Ratau', zone=6 WHERE id='0ede4f6d-7c29-4d34-b061-3871a12e335f'; -- [Maseru] Greenfield
UPDATE public.enterprises SET location_detail='Ha Moima', zone=1 WHERE id='885f3984-c9dd-44dc-995c-ae57c9c0ab82'; -- [Maseru] Hae Ha Moima Far Productions Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Mantsebo', zone=1 WHERE id='b54bf108-6144-425d-9d3d-020bc5595fb6'; -- [Maseru] Hanes Enterprise Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Ntsi', zone=8 WHERE id='78ebb2e3-0cac-4e66-b4e0-95d9ce09184c'; -- [Maseru] Hlotsi
UPDATE public.enterprises SET location_detail='Ha Mosalla', zone=4 WHERE id='0b4cb375-aa9d-4a6d-9a79-29cdea9c36c1'; -- [Maseru] J&P
UPDATE public.enterprises SET location_detail='Setibing', zone=8 WHERE id='a62fb675-23c9-4714-a212-bbc6048d2270'; -- [Maseru] Jehonour
UPDATE public.enterprises SET location_detail='Ha Makhoathi', zone=4 WHERE id='4ccf16d8-ee68-4cbb-b885-0f1f4f9691e8'; -- [Maseru] Joseph Miller
UPDATE public.enterprises SET location_detail='Ha Bosofo', zone=5 WHERE id='00d39469-6053-4416-a62a-c98ec86f788b'; -- [Maseru] Joy
UPDATE public.enterprises SET location_detail='Lehlakaneng', zone=NULL WHERE id='b6c35e06-9c8c-497c-8d4b-f68ae3178e57'; -- [Maseru] Just food
UPDATE public.enterprises SET location_detail='Thaba-Khupa', zone=2 WHERE id='0d2c71cc-f908-4b45-a132-def70338c985'; -- [Maseru] Kabi Farm Produce
UPDATE public.enterprises SET location_detail='Koro-Koro', zone=3 WHERE id='97cba226-3d8b-4ee2-a4f8-bc10c0b8614a'; -- [Maseru] Karabo
UPDATE public.enterprises SET location_detail='Ha Sofonea', zone=4 WHERE id='bf1a17c2-b174-4051-ab21-26f19d11cbe8'; -- [Maseru] Katleho
UPDATE public.enterprises SET location_detail='Not available', zone=NULL WHERE id='e549f8da-dc14-4f15-aa0a-149aa1809a85'; -- [Maseru] Khanya
UPDATE public.enterprises SET location_detail='Setleketseng', zone=7 WHERE id='b827a581-d27c-47c4-9969-2f5a9caee89f'; -- [Maseru] Kori Farming Services
UPDATE public.enterprises SET location_detail='Ha Motloheloa', zone=2 WHERE id='c28c8a88-2703-4cf2-9895-c0394be0b286'; -- [Maseru] Leboea Golden Gardens
UPDATE public.enterprises SET location_detail='Masekoeng', zone=6 WHERE id='428c3423-f7d4-4a99-85b8-1efba0a04b3d'; -- [Maseru] Legacy
UPDATE public.enterprises SET location_detail='Nazareth Ha Mosiu', zone=8 WHERE id='4e9b0d4f-f7df-45b4-a4d4-ba3e4e28c9bc'; -- [Maseru] LFT Beekeepers Machache Pty Ltd
UPDATE public.enterprises SET location_detail='Machekoaneng', zone=2 WHERE id='775cd079-08ad-4612-aa9b-2c280e47fccd'; -- [Maseru] LLQ
UPDATE public.enterprises SET location_detail='Ha Takalimane', zone=NULL WHERE id='cab49c12-0820-4212-adc8-2caa64a18498'; -- [Maseru] Mabung Poultry Farm
UPDATE public.enterprises SET location_detail='Ha Mosalla', zone=4 WHERE id='10693da4-2c78-4a14-862f-bb683bc61a95'; -- [Maseru] Mahamo Family Fortune
UPDATE public.enterprises SET location_detail='Nyakosoba', zone=7 WHERE id='2b024266-e687-4202-93b9-c6e6b7ad6e07'; -- [Maseru] Mahlasela
UPDATE public.enterprises SET location_detail='Ha Mosalla', zone=4 WHERE id='59d4d2af-e0c5-49d1-acc6-31ca96176b38'; -- [Maseru] Mahooana
UPDATE public.enterprises SET location_detail='Ha Makhoathi', zone=4 WHERE id='f1c424d7-c060-4cbb-809c-8e23cd01a581'; -- [Maseru] Makhoathi
UPDATE public.enterprises SET location_detail='Thaba-Chitja', zone=NULL WHERE id='dd250fe1-ebf8-4a10-99e1-67b7f5f27db3'; -- [Maseru] Makopano
UPDATE public.enterprises SET location_detail='Ha Lenono', zone=4 WHERE id='c0634baa-b917-4e41-bc83-fc1cb2c5ae1d'; -- [Maseru] Malataliana Holdings
UPDATE public.enterprises SET location_detail='Ha Ramorakane', zone=NULL WHERE id='ac4429bb-b70e-487d-bc24-2eab0801a1be'; -- [Maseru] Mantebo
UPDATE public.enterprises SET location_detail='Ha Mafefoane', zone=7 WHERE id='01a521fd-d656-4ca6-b18d-1423796b93ef'; -- [Maseru] Mantso
UPDATE public.enterprises SET location_detail='Lithabaneng', zone=5 WHERE id='334deea8-ec85-4672-ac15-d9266e4c599a'; -- [Maseru] Maphothoane
UPDATE public.enterprises SET location_detail='Ha Motloheloa', zone=2 WHERE id='b1ee2788-45a9-43ee-90c9-295b96351988'; -- [Maseru] Mara
UPDATE public.enterprises SET location_detail='Ha Majara', zone=NULL WHERE id='2d8640ae-f671-4b34-ae84-8d0497eb1f60'; -- [Maseru] Masehle Farms Pty Ltd
UPDATE public.enterprises SET location_detail='Semonkong -Ha Samuel', zone=7 WHERE id='a3a3d35d-ce06-450b-8aac-c3897fa13bb6'; -- [Maseru] Masotsa
UPDATE public.enterprises SET location_detail='Morija', zone=1 WHERE id='75025c19-db86-4db4-97ff-44fcd6788f9b'; -- [Maseru] Meat and deli
UPDATE public.enterprises SET location_detail='Boinyatso', zone=3 WHERE id='d61a95db-72c5-43ec-849d-798252336e6b'; -- [Maseru] Mein Kiiys Brokers
UPDATE public.enterprises SET location_detail='Ha Makhale', zone=6 WHERE id='9a3d9385-b491-4915-b221-1d2bb727d9d2'; -- [Maseru] Metolong
UPDATE public.enterprises SET location_detail='Metolong', zone=6 WHERE id='35932ba9-6df1-4b25-ab0e-d1d74f93e988'; -- [Maseru] Mission possible
UPDATE public.enterprises SET location_detail='Ha Mofoka', zone=3 WHERE id='7a8986f5-a864-4ab4-9fbe-42cb35d330cc'; -- [Maseru] Mofoka
UPDATE public.enterprises SET location_detail='Mokema', zone=3 WHERE id='81532e02-0277-47a2-8c92-de7d7b622896'; -- [Maseru] Mohlerepe Piggery
UPDATE public.enterprises SET location_detail='Mahloenyeng', zone=3 WHERE id='cd883efd-6bae-4f95-813b-2a6cd87469e2'; -- [Maseru] Molekane Culture Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Mohasoa', zone=1 WHERE id='20bd6e9e-1893-4d64-9422-1247c43a8020'; -- [Maseru] Molete Veggies
UPDATE public.enterprises SET location_detail='Ha Motloheloa', zone=2 WHERE id='9699798d-3ccf-4e6a-a152-7ec471a1305e'; -- [Maseru] Moloinyane
UPDATE public.enterprises SET location_detail='Jorotane Ha Nyakane', zone=8 WHERE id='672f1efa-6013-4dd5-93dc-a181325beb37'; -- [Maseru] Motete
UPDATE public.enterprises SET location_detail='Metolong Ha Makotoko', zone=6 WHERE id='707fe902-a026-494e-87fd-94bb2c3c858a'; -- [Maseru] Mphu
UPDATE public.enterprises SET location_detail='Ha Foto Mokema', zone=3 WHERE id='7faebae9-b034-48b7-8fcd-93ad5f857005'; -- [Maseru] MPK Farming Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Mohasoa', zone=1 WHERE id='8925f5f1-0c9b-4e0f-8b53-1fa9677854ed'; -- [Maseru] Mteekay
UPDATE public.enterprises SET location_detail='Ha Tlhakanelo', zone=NULL WHERE id='4dbf9e26-306c-4f85-b683-7ae0a26672fc'; -- [Maseru] Next group
UPDATE public.enterprises SET location_detail='Matsieng', zone=1 WHERE id='ce162afa-7cd3-414d-a07b-ee313b0621e2'; -- [Maseru] Nthunya
UPDATE public.enterprises SET location_detail='Ha Maja', zone=2 WHERE id='71677bb4-db1a-4d6a-bbd2-0fcc91312d25'; -- [Maseru] Nyane Vegetable Farm Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Teko', zone=1 WHERE id='dad655b5-e0c8-46a7-8da5-dabbeb644b23'; -- [Maseru] Oasis Inc Pty Ltd
UPDATE public.enterprises SET location_detail='Low Thamae', zone=5 WHERE id='5802c022-0cc1-4c9e-91d3-4cc4c611ce62'; -- [Maseru] PBL  Farm Products
UPDATE public.enterprises SET location_detail='Ha LIIle', zone=NULL WHERE id='7bd38408-d526-4a2d-91c6-9ba26476ef2d'; -- [Maseru] Pig masters
UPDATE public.enterprises SET location_detail='Setleketseng', zone=7 WHERE id='610774d8-e55a-4402-928f-74a454ad4673'; -- [Maseru] Pitso
UPDATE public.enterprises SET location_detail='Thaba-Bosiu', zone=4 WHERE id='c01b47a3-6949-4de0-b3aa-efd34b1f20ce'; -- [Maseru] Plateau
UPDATE public.enterprises SET location_detail='ST. Michael', zone=3 WHERE id='e7c2cb75-fc80-4a61-aff3-1efc3f497867'; -- [Maseru] Project Mng
UPDATE public.enterprises SET location_detail='Mohlaka OA Tuka', zone=8 WHERE id='54dc2995-9ed7-43f5-9e62-f106a218198a'; -- [Maseru] Queenslink
UPDATE public.enterprises SET location_detail='Thaba-Bosiu', zone=4 WHERE id='c6b02033-3111-4174-9627-7513ac328a54'; -- [Maseru] Rafatse
UPDATE public.enterprises SET location_detail='Thaba-Bosiu', zone=4 WHERE id='4c50612f-1f2a-43a5-b047-c2d481ae9622'; -- [Maseru] Rahabs
UPDATE public.enterprises SET location_detail='Moeaneng', zone=NULL WHERE id='c6b2e205-e02b-4e38-89bb-085c1e415909'; -- [Maseru] Raliete Agricultural Imputs & farm Products
UPDATE public.enterprises SET location_detail='Not available', zone=NULL WHERE id='c4cf7132-6ef2-425d-9c71-2a3ef263347b'; -- [Maseru] Ramakoatla
UPDATE public.enterprises SET location_detail='Ha Teko', zone=1 WHERE id='f1c1baad-edcb-4693-9396-85f7cfd8ddc2'; -- [Maseru] Rangers Farm
UPDATE public.enterprises SET location_detail='Metolong Ha Rahachele', zone=6 WHERE id='418bb180-13f5-4a59-8252-851b588096d4'; -- [Maseru] Ratau 02 Community Development
UPDATE public.enterprises SET location_detail='Ha Motanyane', zone=7 WHERE id='425e0c84-05ae-4567-a9c2-0a29e8be7472'; -- [Maseru] Seeqela
UPDATE public.enterprises SET location_detail='Ha Motloheloa', zone=2 WHERE id='c438c13c-5db5-43f9-9d39-da898e30f7d4'; -- [Maseru] Sekoala
UPDATE public.enterprises SET location_detail='Ha Molengoana', zone=8 WHERE id='22141b64-d78d-4a0c-b6cd-31040690b5e8'; -- [Maseru] Sekoting
UPDATE public.enterprises SET location_detail='Matukeng', zone=1 WHERE id='4ca09814-a9d0-40f6-a07a-b1eebb7202ee'; -- [Maseru] Shandu
UPDATE public.enterprises SET location_detail='Ha Motloheloa', zone=2 WHERE id='bc667bf4-b7ea-4875-a085-08f672e44f19'; -- [Maseru] Shines
UPDATE public.enterprises SET location_detail='Masowe', zone=5 WHERE id='3f25e015-ee67-4383-94d5-28bc191a7a43'; -- [Maseru] Shinny Hands Farm Produce
UPDATE public.enterprises SET location_detail='Ha Phaloane', zone=8 WHERE id='bee1abbc-f473-4bc3-987f-192e1c0413bb'; -- [Maseru] Smooth operators
UPDATE public.enterprises SET location_detail='Not available', zone=NULL WHERE id='0b2aa0dc-9ec4-4a72-ad05-92e00d87e840'; -- [Maseru] Thabang
UPDATE public.enterprises SET location_detail='Mookoli', zone=5 WHERE id='e5b5b497-7b39-4b73-b7fd-0984baee2dd8'; -- [Maseru] The past
UPDATE public.enterprises SET location_detail='Mazenod', zone=2 WHERE id='870da12c-bf30-4cc5-9a16-9ff32738fd50'; -- [Maseru] Thomo Agriculture
UPDATE public.enterprises SET location_detail='Ha Mofoka', zone=3 WHERE id='1af7d04a-3215-410e-bbdb-26a2d03b35d2'; -- [Maseru] TM Agri
UPDATE public.enterprises SET location_detail='Morija', zone=1 WHERE id='6253d336-d7e1-4b85-9d6d-8aa16b98e5fb'; -- [Maseru] Tsoso
UPDATE public.enterprises SET location_detail='Sekamaneng', zone=NULL WHERE id='7c97bef8-31b2-4bd0-b43a-a0e5ef9be918'; -- [Berea] AKK Mohasula
UPDATE public.enterprises SET location_detail='Seqonoka', zone=NULL WHERE id='8e09bedc-0403-43dd-91ed-7c8886562096'; -- [Berea] Amazing Grace
UPDATE public.enterprises SET location_detail='Ha Bua-sono', zone=NULL WHERE id='8182bd2b-daf8-4fca-b82a-3fb51b6dfa93'; -- [Berea] Anns Poultry Farm
UPDATE public.enterprises SET location_detail='Sekamaneng', zone=NULL WHERE id='4f12126b-ab76-4d60-ad28-9e5b738aaeeb'; -- [Berea] Bkaak
UPDATE public.enterprises SET location_detail='Lekokoaneng Ha Fusi', zone=NULL WHERE id='465f185c-66a3-417f-8c82-c8eb769d6fb4'; -- [Berea] Caledon View Farming
UPDATE public.enterprises SET location_detail='Palace', zone=NULL WHERE id='568311b4-95a3-4758-92d6-a28920815e27'; -- [Berea] Chota Masters
UPDATE public.enterprises SET location_detail='Ha Hlajoane Lithakong', zone=NULL WHERE id='af3be0ca-cb83-4d18-b5ea-6c7564bde309'; -- [Berea] Emely Farm Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Makebe', zone=NULL WHERE id='75e4ef37-453f-4aea-9c91-8f20f872729b'; -- [Berea] Fresh Mountain Asparagus Pty Ltd
UPDATE public.enterprises SET location_detail='Berea Mission', zone=NULL WHERE id='b46f1740-c55c-4ae9-9d26-09a657f7f002'; -- [Berea] Global Agricultural Produce
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='fdd6e000-4dfd-46ef-940f-e162a57cbb40'; -- [Berea] Hansen
UPDATE public.enterprises SET location_detail='Lekokoaneng', zone=NULL WHERE id='6aa02c9f-cee1-4e20-8732-540b80aebeb8'; -- [Berea] Hlephole agri Business
UPDATE public.enterprises SET location_detail='Ha Mosethe', zone=NULL WHERE id='7beb5c91-e408-4073-8bcc-91fb776a49b5'; -- [Berea] Kepo Agri
UPDATE public.enterprises SET location_detail='Ha Phoofolo', zone=NULL WHERE id='5bcb99db-61c5-4373-9e10-a3c5008a2cb6'; -- [Berea] Koeneng Farm Fresh
UPDATE public.enterprises SET location_detail='Jorotane', zone=NULL WHERE id='6dfa53f8-8451-4ebd-9a8a-2709823c3ae8'; -- [Berea] KT Enterprise Pty Ltd
UPDATE public.enterprises SET location_detail='Bela-Bela', zone=NULL WHERE id='53efa197-78c0-4adb-9aab-da10a8955630'; -- [Berea] L.Masenye Poultry Farm
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='cde0fcab-686e-454e-80e2-05a0ab451dcb'; -- [Berea] Lebese Farm Suppliers
UPDATE public.enterprises SET location_detail='Not available', zone=NULL WHERE id='13a773b6-bb54-4ed9-af9c-e0e2d22f800d'; -- [Berea] Lekhoakhoa farms
UPDATE public.enterprises SET location_detail='Berea Hills', zone=NULL WHERE id='47ccf989-e3ab-4af6-b21b-645f03c26474'; -- [Berea] Leribe Green Farming
UPDATE public.enterprises SET location_detail='Baking', zone=NULL WHERE id='5efef0d6-71fa-4424-98f5-bfe25436c6d5'; -- [Berea] Letsoara Poultry
UPDATE public.enterprises SET location_detail='Ha Malei', zone=NULL WHERE id='33954c47-1102-4c0b-8542-c12c5bfb3448'; -- [Berea] Lifeline Intergrated
UPDATE public.enterprises SET location_detail='Sekamaneng', zone=NULL WHERE id='e8fa9924-58cf-4dd0-a335-45862fdb5431'; -- [Berea] Loli
UPDATE public.enterprises SET location_detail='Ha Matjotjo', zone=NULL WHERE id='7bd50e20-3985-4916-82b9-309ce22b7ecb'; -- [Berea] Magnetic farm
UPDATE public.enterprises SET location_detail='Thupa-Kubu', zone=NULL WHERE id='4316ed91-0195-4773-af70-d30bae35e486'; -- [Berea] Malebaea Peter and his Family
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='0fcd332c-e603-4599-b2e0-6a3046700ba7'; -- [Berea] Mamorena & TM Poultry
UPDATE public.enterprises SET location_detail='Mokhethoaneng', zone=NULL WHERE id='d35c7024-9a2b-44d1-a3fa-3325b65436ed'; -- [Berea] Map City Smart Agro
UPDATE public.enterprises SET location_detail='Khubetsoana', zone=NULL WHERE id='bd37995f-d7f6-46e3-bdc6-93cb561fb998'; -- [Berea] Maqalika Agric farm Project
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='1c644337-6971-4f4e-8c92-856d31ed377a'; -- [Berea] Masutsa
UPDATE public.enterprises SET location_detail='Sekamaneng', zone=NULL WHERE id='065b2e36-9da6-4627-ac03-f428e2427431'; -- [Berea] MBO
UPDATE public.enterprises SET location_detail='Ha Mphele', zone=NULL WHERE id='a7ebd606-bdb6-410f-b14b-eceabc6ccc43'; -- [Berea] Mohale's Farming Development Projects
UPDATE public.enterprises SET location_detail='Kolojane, Ha Letsoela', zone=NULL WHERE id='9c75781b-65e5-45e1-9228-881873427da1'; -- [Berea] Mothabi Piggery
UPDATE public.enterprises SET location_detail='Berea', zone=NULL WHERE id='4644f86e-67c6-4685-a63a-eab495a14d00'; -- [Berea] Mpela Motloli
UPDATE public.enterprises SET location_detail='Ha Mabote', zone=NULL WHERE id='b970ace9-ecef-48b4-82db-b5f266450c9b'; -- [Berea] Mrs Chicken Pty Ltd
UPDATE public.enterprises SET location_detail='Berea Mission', zone=NULL WHERE id='83ed7639-ed00-406f-94f3-963f2ceb4f27'; -- [Berea] Octagon
UPDATE public.enterprises SET location_detail='Khubetsoana', zone=NULL WHERE id='137238a1-4cba-4c77-8825-f472db2d9582'; -- [Berea] Pemora Agric Solution
UPDATE public.enterprises SET location_detail='Thuathe Ha Ralimo', zone=NULL WHERE id='29b16457-5fdb-4f1c-a064-3bbfa985e837'; -- [Berea] Qaleho
UPDATE public.enterprises SET location_detail='Koalabata', zone=NULL WHERE id='c2183d04-c47a-49de-823a-0282c7497039'; -- [Berea] Qotha Farms Pty Ltd
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='cb2fae37-969d-421f-96d6-09b4ad63e965'; -- [Berea] R & J Delight Pty Ltd
UPDATE public.enterprises SET location_detail='Ha Ratsiu', zone=NULL WHERE id='2db15980-bb76-4901-8d27-765e56569406'; -- [Berea] Ratsiu Agro Farm
UPDATE public.enterprises SET location_detail='Berea Hills', zone=NULL WHERE id='0f5b63e8-ebbb-44c4-9f7d-b9c57006ffc2'; -- [Berea] Sammy
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='a8ffd359-446b-4520-945c-5c9351ceea1b'; -- [Berea] Snow Group
UPDATE public.enterprises SET location_detail='Sekamaneng', zone=NULL WHERE id='57221fc1-20bd-4c45-87c6-f16d75f5cd6e'; -- [Berea] Snowy Veggies
UPDATE public.enterprises SET location_detail='Kolojane, Ha Letsoela', zone=NULL WHERE id='980946fa-99a7-4602-96ff-a1398dfdac3c'; -- [Berea] Supergood
UPDATE public.enterprises SET location_detail='Sefikeng', zone=NULL WHERE id='8b3e588e-21f7-48f2-8057-add8dd38b7e9'; -- [Berea] Thaba-Lifika Farm
UPDATE public.enterprises SET location_detail='Sekamaneng', zone=NULL WHERE id='ebaba12f-a893-4c5e-9868-af5dac787b17'; -- [Berea] The Great Farmer Pty Ltd
UPDATE public.enterprises SET location_detail='Sehlabeng Pela sekolo sa Machina', zone=NULL WHERE id='839f257d-36a7-4387-9704-684272bd1446'; -- [Berea] The Lynth Fresh Produce Pty Ltd
UPDATE public.enterprises SET location_detail='Palace', zone=NULL WHERE id='c54f0afa-0aad-4314-aa34-f3e69032d635'; -- [Berea] TKL Farm Production
UPDATE public.enterprises SET location_detail='Ha Ramothamo', zone=NULL WHERE id='9a3e6acb-62fd-4a67-981f-89f91b79943e'; -- [Berea] Tlhabeli Majoro Farm
UPDATE public.enterprises SET location_detail='Sehlabeng', zone=NULL WHERE id='961a3c1d-f283-4c18-838a-ebbfc4aaf234'; -- [Berea] Total trust
UPDATE public.enterprises SET location_detail='Thuathe Ha Ralimo', zone=NULL WHERE id='753b97b0-dd21-4f55-979f-adaea40b9b63'; -- [Berea] VEL
UPDATE public.enterprises SET location_detail='Linokong', zone=NULL WHERE id='789c1a51-f509-4e91-8012-1684f886e030'; -- [Thaba-Tseka] Basia
UPDATE public.enterprises SET location_detail='Ha Khoanyane', zone=NULL WHERE id='0beb1b86-bdc1-4ed9-acbe-deb437999f29'; -- [Thaba-Tseka] Goshen
UPDATE public.enterprises SET location_detail='Ha Nakeli', zone=NULL WHERE id='fa593823-d351-488d-b87e-96cbde29f85e'; -- [Thaba-Tseka] Lijane and sons
UPDATE public.enterprises SET location_detail='Liphokoaneng', zone=NULL WHERE id='07884f4d-ebfc-4bd5-ba6d-cc7a61d29fea'; -- [Thaba-Tseka] Makhele
UPDATE public.enterprises SET location_detail='Ha Rantsimane', zone=NULL WHERE id='1ca47180-3bac-4bdd-9061-d891d4bfe300'; -- [Thaba-Tseka] Mankoaneng
UPDATE public.enterprises SET location_detail='Mohlanapeng', zone=NULL WHERE id='2e015f6a-0595-4c13-a93b-994e5550d6a7'; -- [Thaba-Tseka] Mokhoabong
UPDATE public.enterprises SET location_detail='Thabong I', zone=NULL WHERE id='2b90715d-c804-4113-91fb-6acb60937e71'; -- [Thaba-Tseka] Nona
UPDATE public.enterprises SET location_detail='Liphokoaneng', zone=NULL WHERE id='ee38222f-aafc-424e-aa51-7bc986df8228'; -- [Thaba-Tseka] Ntaote
UPDATE public.enterprises SET location_detail='Phomolong', zone=NULL WHERE id='d67ff3af-6085-4dea-9181-6c4b278f53cc'; -- [Thaba-Tseka] Ora
UPDATE public.enterprises SET location_detail='Ha Muso', zone=NULL WHERE id='2083179c-68d8-427f-991d-5aca2cff3f8e'; -- [Thaba-Tseka] PP Crocodile
UPDATE public.enterprises SET location_detail='Malihase', zone=NULL WHERE id='4c1f2eb6-6f3b-4445-8e16-76e125df72ee'; -- [Thaba-Tseka] Rising Star
UPDATE public.enterprises SET location_detail='Ha Ramalapi', zone=NULL WHERE id='14161ccd-eafc-4386-868f-10275f840e06'; -- [Thaba-Tseka] Seforong
UPDATE public.enterprises SET location_detail='Ha Toka', zone=NULL WHERE id='5d666f5d-d197-4e42-95ca-b8719754d1ba'; -- [Thaba-Tseka] Thipe
COMMIT;
