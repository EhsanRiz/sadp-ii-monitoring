-- Migration 292: reassign monitoring Zones for specific Maseru enterprises,
-- per the 2026-06 zoning reclassification request.
--
-- Depends on migration 291 (Zone 9 must be an allowed value). Matches rows by
-- id and sets absolute zone values, so it is idempotent and safe to re-run.
--
-- Note: Evowen and Malataliana were previously Zone 4 (the request labelled
-- them "Unzoned", but the intended target is Zone 5). Masotsa moves out of
-- Zone 7 into the new Zone 9 simply by overwriting its zone.

-- → Zone 1
UPDATE public.enterprises SET zone = 1 WHERE id IN (
  'd599ae04-8932-4350-9924-853bdd29a7b4', -- Dibu
  'ac4429bb-b70e-487d-bc24-2eab0801a1be', -- Mantebo
  '4dbf9e26-306c-4f85-b683-7ae0a26672fc', -- Next group
  'dd250fe1-ebf8-4a10-99e1-67b7f5f27db3'  -- Makopano
);

-- → Zone 2
UPDATE public.enterprises SET zone = 2 WHERE id IN (
  'c6b2e205-e02b-4e38-89bb-085c1e415909', -- Raliete Agricultural Imputs & farm Products
  'cab49c12-0820-4212-adc8-2caa64a18498', -- Mabung Poultry Farm
  '929fb08e-059b-4edd-8e48-97d5cdfce80c'  -- Avails
);

-- → Zone 3
UPDATE public.enterprises SET zone = 3 WHERE id = '7bd38408-d526-4a2d-91c6-9ba26476ef2d'; -- Pig masters

-- → Zone 5 (were Zone 4)
UPDATE public.enterprises SET zone = 5 WHERE id IN (
  '137a0ea0-3068-4d6e-8504-690136d7f08a', -- Evowen
  'c0634baa-b917-4e41-bc83-fc1cb2c5ae1d'  -- Malataliana Holdings
);

-- → Zone 9 (was Zone 7) — new Semonkong zone
UPDATE public.enterprises SET zone = 9 WHERE id = 'a3a3d35d-ce06-450b-8aac-c3897fa13bb6'; -- Masotsa
