#!/usr/bin/env python3
"""
load_4d_catalog.py — load 4D Climate Solutions' geographic catalog into Supabase.

Reads the normalized CSVs in ../../extracted_catalog/ and upserts:
  - districts (3 rows: Berea, Maseru, Thaba-Tseka)
  - community_councils (27 rows)
  - resource_centers (17 rows)
  - villages (~140 rows)

All scoped to the '4D' organization. RSDA's catalog loads via a parallel script
once their data is received.

Prereqs:
  - Run migrations 010-100 first
  - Run seeds 110_seed_organizations.sql first (so the 4D org exists)
  - pip install supabase python-dotenv
  - .env in this folder with:
       SUPABASE_URL=https://YOUR-PROJECT.supabase.co
       SUPABASE_SERVICE_ROLE_KEY=ey...        # NOT the anon key — service role bypasses RLS

Usage:
  python load_4d_catalog.py [--dry-run]
"""
from __future__ import annotations
import argparse
import csv
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    from supabase import create_client, Client
except ImportError:
    sys.exit("Install dependencies first: pip install supabase python-dotenv")

ORG_CODE = "4D"
SCRIPT_DIR = Path(__file__).resolve().parent
CATALOG_DIR = SCRIPT_DIR.parent.parent / "extracted_catalog"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Parse CSVs but don't write to Supabase")
    args = parser.parse_args()

    load_dotenv(SCRIPT_DIR / ".env")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key) and not args.dry_run:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or use --dry-run).")

    client: Client | None = None if args.dry_run else create_client(url, key)

    # 1. Look up the 4D organization id
    org_id = None
    if client:
        res = client.table("organizations").select("id").eq("code", ORG_CODE).execute()
        if not res.data:
            sys.exit(f"Organization with code '{ORG_CODE}' not found. Run 110_seed_organizations.sql first.")
        org_id = res.data[0]["id"]
        print(f"[ok] Found organization {ORG_CODE} → {org_id}")
    else:
        print(f"[dry-run] Would look up org code '{ORG_CODE}'")

    # 2. Load districts
    districts_rows = read_csv(CATALOG_DIR / "01_districts.csv")
    district_ids: dict[str, str] = {}
    for r in districts_rows:
        name = r["district_name"]
        if args.dry_run:
            print(f"[dry-run] district: {name}")
            continue
        existing = client.table("districts").select("id").eq("organization_id", org_id).eq("name", name).execute()
        if existing.data:
            district_ids[name] = existing.data[0]["id"]
            print(f"[exists] district: {name}")
        else:
            ins = client.table("districts").insert({
                "organization_id": org_id,
                "name": name,
            }).execute()
            district_ids[name] = ins.data[0]["id"]
            print(f"[insert] district: {name}")

    # 3. Load community councils (per district)
    cc_rows = read_csv(CATALOG_DIR / "02_community_councils.csv")
    inserted_cc = 0
    skipped_cc = 0
    for r in cc_rows:
        d_name = r["district_name"]
        cc_name = r["community_council_name"]
        if args.dry_run:
            print(f"[dry-run] cc: {d_name} / {cc_name}")
            continue
        d_id = district_ids.get(d_name)
        if not d_id:
            print(f"[warn] CC '{cc_name}' references unknown district '{d_name}' — skipping")
            skipped_cc += 1
            continue
        exists = client.table("community_councils").select("id").eq("district_id", d_id).eq("name", cc_name).execute()
        if exists.data:
            continue
        client.table("community_councils").insert({"district_id": d_id, "name": cc_name}).execute()
        inserted_cc += 1
    if not args.dry_run:
        print(f"[ok] community_councils: inserted {inserted_cc}, skipped {skipped_cc}")

    # 4. Load resource centers (per district)
    rc_rows = read_csv(CATALOG_DIR / "03_resource_centers.csv")
    inserted_rc = 0
    for r in rc_rows:
        d_name = r["district_name"]
        rc_name = r["resource_center_name"]
        if args.dry_run:
            print(f"[dry-run] rc: {d_name} / {rc_name}")
            continue
        d_id = district_ids.get(d_name)
        if not d_id:
            print(f"[warn] RC '{rc_name}' references unknown district '{d_name}' — skipping")
            continue
        exists = client.table("resource_centers").select("id").eq("district_id", d_id).eq("name", rc_name).execute()
        if exists.data:
            continue
        client.table("resource_centers").insert({"district_id": d_id, "name": rc_name}).execute()
        inserted_rc += 1
    if not args.dry_run:
        print(f"[ok] resource_centers: inserted {inserted_rc}")

    # 5. Load villages (per district)
    v_rows = read_csv(CATALOG_DIR / "04_villages.csv")
    inserted_v = 0
    for r in v_rows:
        d_name = r["district_name"]
        v_name = r["village_name"]
        if args.dry_run:
            print(f"[dry-run] village: {d_name} / {v_name}")
            continue
        d_id = district_ids.get(d_name)
        if not d_id:
            print(f"[warn] Village '{v_name}' references unknown district '{d_name}' — skipping")
            continue
        exists = client.table("villages").select("id").eq("district_id", d_id).eq("name", v_name).execute()
        if exists.data:
            continue
        client.table("villages").insert({"district_id": d_id, "name": v_name}).execute()
        inserted_v += 1
    if not args.dry_run:
        print(f"[ok] villages: inserted {inserted_v}")

    print("\nCatalog load complete.")
    return 0


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        sys.exit(f"Catalog file not found: {path}")
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


if __name__ == "__main__":
    sys.exit(main())
