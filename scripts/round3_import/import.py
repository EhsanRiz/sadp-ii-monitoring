#!/usr/bin/env python3
"""
round3_import/import.py — import the 191 Round 3 enterprises from the 4D Excel
into the new Supabase schema as round_id=3 records with
registration_completeness='minimal'.

Strategy:
  1. Read 07_sample_enterprises_round3.csv (already normalized by the catalog
     extraction step).
  2. For each row, resolve foreign keys against the loaded catalog:
       district_name → district_id
       (district_id, cc_name) → community_council_id (may be NULL)
       (district_id, rc_name) → resource_center_id (may be NULL)
       (district_id, village_name) → village_id (auto-insert if missing)
       enterprise_type string → enterprise_type_id (normalised match)
  3. Insert with the minimum required fields. Borehole flags from Excel get
     mapped onto the enterprises.borehole_* columns.
  4. Record every normalization, every missing FK, every successful insert.
  5. Emit ROUND3_IMPORT_REPORT.md so Ehsan can audit before committing.

Prereqs:
  - migrations 010-100 applied
  - seeds 110, 120, 130 run
  - load_4d_catalog.py run successfully (so districts/CCs/RCs/villages exist)
  - .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

Usage:
  python import.py [--dry-run]
"""
from __future__ import annotations
import argparse
import csv
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
    from supabase import create_client, Client
except ImportError:
    sys.exit("Install dependencies: pip install supabase python-dotenv")

ORG_CODE = "4D"
ROUND_ID = 3
SCRIPT_DIR = Path(__file__).resolve().parent
CATALOG_DIR = SCRIPT_DIR.parent.parent / "extracted_catalog"
CSV_PATH = CATALOG_DIR / "07_sample_enterprises_round3.csv"
REPORT_PATH = SCRIPT_DIR / "ROUND3_IMPORT_REPORT.md"

# Map normalized enterprise type strings (from the CSV) to enterprise_types.code
TYPE_MAP = {
    "Vegetable Production": "vegetable_production",
    "Hydroponics": "hydroponics",
    "Seedling Production": "seedling_production",
    "Broiler Production": "broiler_production",
    "Egg Production": "egg_production",
    "Hatchery": "hatchery",
    "Duck Production": "duck_production",
    "Piggery": "piggery",
    "Dairy Production": "dairy_production",
    "Ram Breeding": "ram_breeding",
    "Ram & Buck Breeding": "ram_buck_breeding",
    "Livestock Production": "livestock_production",
    "Fish Production": "fish_production",
    "Meat Processing": "meat_processing",
    "Fruit Drying": "fruit_drying",
    "Fruit & Vegetable Processing": "fruit_veg_processing",
    "Milling": "milling",
}

def yn(v: str | None) -> bool:
    return bool(v) and v.strip().lower() in ("yes", "y", "true", "1")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate but don't insert")
    args = parser.parse_args()

    load_dotenv(SCRIPT_DIR / ".env")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key) and not args.dry_run:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or use --dry-run).")

    client: Client | None = None if args.dry_run else create_client(url, key)

    # ------------------------------------------------------------------
    # Fetch all catalog rows into in-memory lookups
    # ------------------------------------------------------------------
    if not args.dry_run:
        org_id = client.table("organizations").select("id").eq("code", ORG_CODE).execute().data[0]["id"]
        districts = {d["name"]: d["id"] for d in client.table("districts").select("id,name").eq("organization_id", org_id).execute().data}
        ccs = defaultdict(dict)
        for cc in client.table("community_councils").select("id,name,district_id").eq("organization_id", org_id).execute().data:
            ccs[cc["district_id"]][cc["name"]] = cc["id"]
        rcs = defaultdict(dict)
        for rc in client.table("resource_centers").select("id,name,district_id").eq("organization_id", org_id).execute().data:
            rcs[rc["district_id"]][rc["name"]] = rc["id"]
        villages = defaultdict(dict)
        for v in client.table("villages").select("id,name,district_id").eq("organization_id", org_id).execute().data:
            villages[v["district_id"]][v["name"]] = v["id"]
        types_by_code = {t["code"]: t["id"] for t in client.table("enterprise_types").select("id,code").execute().data}
        print(f"[ok] Catalog loaded: {len(districts)} districts, {sum(len(v) for v in ccs.values())} CCs, "
              f"{sum(len(v) for v in rcs.values())} RCs, {sum(len(v) for v in villages.values())} villages, "
              f"{len(types_by_code)} types")
    else:
        org_id = "dry-run-org-id"
        districts, ccs, rcs, villages, types_by_code = {}, {}, {}, {}, {}

    # ------------------------------------------------------------------
    # Process the CSV
    # ------------------------------------------------------------------
    rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8")))
    report = ImportReport(total_rows=len(rows))

    for line_no, r in enumerate(rows, start=2):  # 1-indexed; header is line 1
        try:
            district_name = (r.get("district") or "").strip()
            cc_name       = (r.get("community_council") or "").strip()
            rc_name       = (r.get("resource_center") or "").strip()
            village_name  = (r.get("village") or "").strip()
            beneficiary   = (r.get("beneficiary_name") or "").strip()
            type_raw      = (r.get("enterprise_type") or "").strip()
            contact       = (r.get("beneficiary_contact") or "").strip()
            sp_name       = (r.get("service_provider_name") or "").strip()
            already_bh    = yn(r.get("already_have_borehole"))
            drilled       = yn(r.get("completely_drilled"))
            incomplete    = yn(r.get("incomplete"))

            if not (district_name and beneficiary and type_raw):
                report.skipped.append(f"line {line_no}: missing district/beneficiary/type")
                continue

            if district_name not in districts and not args.dry_run:
                report.missing_districts.add(district_name)
                report.skipped.append(f"line {line_no}: district '{district_name}' not in catalog")
                continue

            d_id = districts.get(district_name)

            cc_id = ccs.get(d_id, {}).get(cc_name) if cc_name else None
            if cc_name and not cc_id and not args.dry_run:
                report.missing_ccs.add(f"{district_name} / {cc_name}")

            rc_id = rcs.get(d_id, {}).get(rc_name) if rc_name else None
            if rc_name and not rc_id and not args.dry_run:
                report.missing_rcs.add(f"{district_name} / {rc_name}")

            # Auto-insert village if missing (Field Supervisors do this in the UI too)
            v_id = villages.get(d_id, {}).get(village_name) if village_name else None
            if village_name and not v_id and not args.dry_run:
                ins = client.table("villages").insert({"district_id": d_id, "name": village_name}).execute()
                v_id = ins.data[0]["id"]
                villages[d_id][village_name] = v_id
                report.auto_added_villages.append(f"{district_name} / {village_name}")

            type_code = TYPE_MAP.get(type_raw)
            if not type_code:
                report.unmapped_types.add(type_raw)
                report.skipped.append(f"line {line_no}: enterprise type '{type_raw}' not in TYPE_MAP")
                continue
            type_id = types_by_code.get(type_code) if not args.dry_run else 0

            payload = {
                "organization_id": org_id,
                "round_id": ROUND_ID,
                "registration_completeness": "minimal",
                "enterprise_type_id": type_id,
                "beneficiary_short_name": beneficiary,
                "applicant_organisation_name": beneficiary,  # placeholder; field staff edits to formal name later
                "district_id": d_id,
                "community_council_id": cc_id,
                "resource_center_id": rc_id,
                "village_id": v_id,
                "beneficiary_contact_phone": contact or None,
                "service_provider_name": sp_name or None,
                "borehole_pre_existing": already_bh,
                "borehole_drilled": drilled,
                "borehole_drilling_incomplete": incomplete,
            }

            if args.dry_run:
                report.would_insert.append(f"line {line_no}: {beneficiary} ({type_raw}) in {district_name}")
                continue

            client.table("enterprises").insert(payload).execute()
            report.inserted += 1

        except Exception as e:
            report.errors.append(f"line {line_no} ({beneficiary!r}): {e}")

    # ------------------------------------------------------------------
    # Emit report
    # ------------------------------------------------------------------
    report.write(REPORT_PATH)
    print(f"\nImport complete. Report: {REPORT_PATH}")
    print(f"  inserted={report.inserted}  skipped={len(report.skipped)}  errors={len(report.errors)}")
    print(f"  missing_ccs={len(report.missing_ccs)}  missing_rcs={len(report.missing_rcs)}  "
          f"unmapped_types={len(report.unmapped_types)}")
    return 0 if not report.errors else 1


class ImportReport:
    def __init__(self, total_rows: int):
        self.total_rows = total_rows
        self.inserted = 0
        self.skipped: list[str] = []
        self.errors: list[str] = []
        self.would_insert: list[str] = []
        self.missing_districts: set[str] = set()
        self.missing_ccs: set[str] = set()
        self.missing_rcs: set[str] = set()
        self.unmapped_types: set[str] = set()
        self.auto_added_villages: list[str] = []

    def write(self, path: Path) -> None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# Round 3 Import Report\n\n")
            f.write(f"_Generated {datetime.now().isoformat(timespec='seconds')}_\n\n")
            f.write(f"## Summary\n\n")
            f.write(f"- Total source rows: {self.total_rows}\n")
            f.write(f"- Inserted: **{self.inserted}**\n")
            f.write(f"- Would insert (dry-run): {len(self.would_insert)}\n")
            f.write(f"- Skipped: {len(self.skipped)}\n")
            f.write(f"- Errors: {len(self.errors)}\n")
            f.write(f"- Auto-added villages: {len(self.auto_added_villages)}\n\n")

            if self.missing_districts:
                f.write("## Missing districts (FATAL — fix catalog and re-run)\n\n")
                for d in sorted(self.missing_districts):
                    f.write(f"- {d}\n")
                f.write("\n")

            if self.missing_ccs:
                f.write("## Community Councils not found in catalog\n\n")
                f.write("These rows imported without a community_council_id. Field staff can complete via the UI.\n\n")
                for x in sorted(self.missing_ccs):
                    f.write(f"- {x}\n")
                f.write("\n")

            if self.missing_rcs:
                f.write("## Resource Centers not found in catalog\n\n")
                f.write("These rows imported without a resource_center_id. Field staff can complete via the UI.\n\n")
                for x in sorted(self.missing_rcs):
                    f.write(f"- {x}\n")
                f.write("\n")

            if self.unmapped_types:
                f.write("## Enterprise types not in TYPE_MAP (FIX required)\n\n")
                f.write("These rows were skipped. Add the value to TYPE_MAP in import.py.\n\n")
                for t in sorted(self.unmapped_types):
                    f.write(f"- `{t}`\n")
                f.write("\n")

            if self.auto_added_villages:
                f.write("## Villages auto-added to catalog during import\n\n")
                for v in sorted(self.auto_added_villages):
                    f.write(f"- {v}\n")
                f.write("\n")

            if self.skipped:
                f.write("## Skipped rows\n\n")
                for s in self.skipped:
                    f.write(f"- {s}\n")
                f.write("\n")

            if self.errors:
                f.write("## Errors\n\n")
                for e in self.errors:
                    f.write(f"- {e}\n")
                f.write("\n")

            f.write("## Next steps\n\n")
            f.write("- Verify counts against the source Excel (191 enterprise rows expected).\n")
            f.write("- Resolve missing CCs / RCs / unmapped types and re-run if needed.\n")
            f.write("- All inserted rows have `registration_completeness = 'minimal'`. Field staff progressively complete them via the UI to flip to `'cover_page_ready'`.\n")


if __name__ == "__main__":
    sys.exit(main())
