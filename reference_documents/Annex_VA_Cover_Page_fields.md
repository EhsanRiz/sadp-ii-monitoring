# Annex V/A — Project Summary Form (Cover Page) — field reference

This is the source-of-truth list of every field on the Annex V/A "I. PROJECT SUMMERY FORM" cover page. The Phase 1 cover-page PDF generator (`/enterprises/:id/cover-page.pdf`) renders this exact layout from the `enterprises` row.

**Example row used to validate the schema:** Hansen Farming PTY LTD (Broiler Production, D2024063, Berea / Sehlabeng sa Thuathe).

## Layout (header → body → office-use)

| Block | Field | Example value | Schema column |
|---|---|---|---|
| Title | Header text | `Annex V/A: Applicant's Progress report Forms` (Cover Page) — `I.PROJECT SUMMERY FORM` | — (static text) |
| Body | Project Title (`as in the contract`) | Broiler production | `enterprises.project_title` |
| Body | Project Registration Number | D2024063 | `enterprises.registration_number` |
| Body | District | Berea | `enterprises.district_id` → `districts.name` |
| Body | Location | Sehlabeng sa Thuathe | `enterprises.location_detail` + `enterprises.resource_center_id` → `resource_centers.name` |
| Body | Period covered by the Report (d/mm/yy–dd/mm/yy) | 31/03/2025 – 31/03/2026 | `enterprises.period_start`, `enterprises.period_end` |
| Body | Total Project Cost (`as in the contract`) | M500,000.00 | `enterprises.total_project_cost_lsl` |
| Body | Total Grant | M400,000.00 | `enterprises.total_grant_lsl` |
| Body | Current Grant Payment | M160,000.00 | `enterprises.current_grant_payment_lsl` |
| Body | Applicant Organisation | Hansen Farming PTY LTD | `enterprises.applicant_organisation_name` |
| Body | Principal Applicant | Mary Hansen | `enterprises.principal_applicant_name` |
| Body | Service Provider | Mpho Mapitse | `enterprises.service_provider_name` (plain text) |
| Body | Signature of Principal Applicants | (uploaded image) | `enterprises.principal_applicant_signature_url` |
| Body | Signature of Service Provider | (uploaded image) | `enterprises.service_provider_signature_url` |
| Body | Date (Principal Applicant) | 24/10/2025 | `enterprises.principal_applicant_signed_date` |
| Body | Date (Service Provider) | 05/11/2025 | `enterprises.service_provider_signed_date` |
| Office use | Received by the CGP Secretariat on date | (dd/mm/yy) | `enterprises.cgp_received_date` |
| Office use | Name and Signature of CGP Officer | (blank until filed) | `enterprises.cgp_officer_name`, `enterprises.cgp_officer_signature_url` |

## Currency formatting

All amounts are Lesotho Loti (M) with two decimal places, comma thousands separator. Format string: `M{:,.2f}`.

## Date formatting

The cover page uses `dd/mm/yyyy` (slash-separated). The schema stores standard ISO `date` — convert at render time.

## What's printed but NOT a database field

- Title and subtitle text ("I.PROJECT SUMMERY FORM", "(Cover Page)", `(ONLY FOR OFFICE USE)`)
- "as in the contract" annotation under Project Title and Total Project Cost
- "(d/mm/yy-dd/mm/yy)" annotation under Period covered

These are static template text in the PDF generator.

## When the cover page can be generated

The PDF generator must verify `enterprises.registration_completeness = 'cover_page_ready'` before rendering. Round 3 imports start at `'minimal'` and must be progressively completed (registration number, dates, costs, applicant + SP names and signatures) before they're ready.
