/**
 * ESSF (Environmental and Social Screening Form) — universal schema.
 *
 * One per enterprise (lifetime). Filled by Field Supervisor at site selection,
 * approved by M&E Officer or Team Leader.
 *
 * Source: ENVIRONMENTAL AND SOCIAL SCREENING FORM (Ver. 2).docx in OneDrive
 * "Company Docs/ESMP forms". Mirrors the 3 tables in that doc.
 *
 * Stored in app code (not DB) because:
 *   - There's only one ESSF schema across all enterprises
 *   - Schema changes infrequently and is governance-controlled by SADP-II HQ
 *   - TypeScript-typed at compile time
 *
 * When the form changes:
 *   1. Bump ESSF_SCHEMA_VERSION
 *   2. Edit the items below
 *   3. The renderer reads essf_submissions.schema_version and falls back to
 *      this latest schema if it's higher than the stored version (old responses
 *      keep rendering against their original schema_version — store a copy in
 *      the responses jsonb if you want strict immutability).
 */

export const ESSF_SCHEMA_VERSION = 1;

// ============================================================================
// Table 1: Site Sensitivity (5 issues × Low/Medium/High descriptors → pick one)
// ============================================================================
export const ESSF_SITE_SENSITIVITY = {
  ratings: ['low', 'medium', 'high'] as const,
  issues: [
    {
      id: 'natural_habitats',
      label: 'Natural habitats',
      descriptors: {
        low: 'No natural habitats present of any kind',
        medium: 'No critical natural habitats; other natural habitats occur',
        high: 'Critical natural habitats present.',
      },
    },
    {
      id: 'water_quality',
      label: 'Water quality and water resource availability and use',
      descriptors: {
        low: 'Water resources exceed any existing demand; low intensity of water use; potential water use conflicts expected to be low; no potential water quality issues',
        medium: 'Medium intensity of water use; multiple water users; water quality issues are important',
        high: 'Intensive water use; multiple water users; potential for conflicts is high; water quality issues are important',
      },
    },
    {
      id: 'natural_hazards',
      label: 'Natural hazards vulnerability, floods, soil stability/erosion',
      descriptors: {
        low: 'Flat terrain; no potential stability/erosion problems; no known volcanic/seismic/flood risks',
        medium: 'Medium slopes; some erosion potential; medium risks from volcanic/seismic/flood/hurricanes',
        high: 'Mountainous terrain; steep slopes; unstable soils; high erosion potential; volcanic, seismic or flood risks',
      },
    },
    {
      id: 'cultural_property',
      label: 'Cultural property',
      descriptors: {
        low: 'No known or suspected cultural heritage sites',
        medium: 'Suspected cultural heritage sites; known heritage sites in broader area of influence',
        high: 'Known heritage sites in project area',
      },
    },
    {
      id: 'involuntary_resettlement',
      label: 'Involuntary resettlement',
      descriptors: {
        low: 'Low population density; dispersed population; legal tenure is well-defined; well-defined water rights',
        medium: 'Medium population density; mixed ownership and land tenure; well-defined water rights',
        high: 'High population density; major towns and villages; low-income families and/or illegal ownership of land; communal properties; unclear water rights',
      },
    },
  ],
} as const;

// ============================================================================
// Table 2: Completeness of Sub-projects Application (Yes/No/N/A per question)
// ============================================================================
export const ESSF_COMPLETENESS = {
  options: ['yes', 'no', 'n_a'] as const,
  questions: [
    { id: 'project_description', label: 'Description of the proposed project and where it is located' },
    { id: 'site_alternatives', label: 'Information about how the site was chosen, and what alternatives were considered' },
    { id: 'map_drawing', label: 'A map or drawing showing the location and boundary of the project including any land required temporarily during construction' },
    { id: 'physical_works_plan', label: 'The plan for any physical works (e.g. layout, buildings, other structures, construction materials)' },
    { id: 'access_arrangements', label: 'Any new access arrangements or changes to existing road layouts' },
    { id: 'land_acquisition', label: 'Any land that needs to be acquired, as well as who owns it, lives on it or has rights to use it' },
    { id: 'work_program', label: 'A work program for construction, operation and decommissioning the physical works, including any site restoration needed afterwards' },
    { id: 'mitigation_measures', label: 'Information about measures to avoid or minimize adverse environmental and social impacts' },
  ],
} as const;

// ============================================================================
// Table 3: Environmental and Social Checklist (24 Y/N questions, grouped A-D)
// ============================================================================
export const ESSF_CHECKLIST = {
  options: ['yes', 'no'] as const,
  groups: [
    {
      id: 'A',
      title: 'Type of activity — Will the sub-projects:',
      footer: 'If the answer to any of questions 1–9 is "Yes", please use the indicated Resource Sheets or sections(s) of the ESMF for guidance on how to avoid or minimize typical impacts and risks',
      questions: [
        { id: 'a1', label: 'Involve the construction or rehabilitation of any small dams, weirs or reservoirs?', guidance: 'O.P 4.37 (Dam safety Assessment)' },
        { id: 'a2', label: 'Support irrigation schemes?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'a3', label: 'Build or rehabilitate any rural roads?', guidance: 'Excluded from this project' },
        { id: 'a4', label: 'Build or rehabilitate any electricity power generating system?', guidance: 'Excluded from this project' },
        { id: 'a5', label: 'Involve food processing?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'a6', label: 'Build or rehabilitate any structures or buildings?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'a7', label: 'Support agricultural activities?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'a8', label: 'Be located in or near an area where there is an important historical, archaeological or cultural heritage site?', guidance: 'O.P 4.11 (Cultural Resources Management Plan / Chance finds)' },
        { id: 'a9', label: 'Be located within or adjacent to any areas that are or may be protected by government (e.g. national park, national reserve, world heritage site) or local tradition, or that might be a natural habitat?', guidance: 'Excluded from this project scope' },
        { id: 'a10', label: 'Depend on water supply from an existing dam, weir, or other water diversion structure?', guidance: 'O.P 4.37 (Dam Safety Assessment)' },
      ],
    },
    {
      id: 'B',
      title: 'Environment — Will the sub-projects:',
      footer: 'If the answer to any of questions 10–18 is "Yes", please include an Environmental and Social Management Plan (ESMP) with the sub-projects application.',
      questions: [
        { id: 'b1', label: 'Risk causing the contamination of drinking water?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'b2', label: 'Affect the quantity or quality of surface waters (e.g. rivers, streams, wetlands), or groundwater (e.g. wells)?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'b3', label: 'Cause poor water drainage and increase the risk of water-related diseases such as malaria or bilharzia?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'b4', label: 'Harvest or exploit a significant amount of natural resources such as trees, soil or water?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'b5', label: 'Be located within or nearby environmentally sensitive areas (e.g. intact natural forests, mangroves, wetlands) or threatened species?', guidance: 'Excluded from this project scope' },
        { id: 'b6', label: 'Create a risk of increased soil degradation or erosion?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'b7', label: 'Create a risk of increasing soil salinity?', guidance: 'O.P 4.01 (Environmental Assessment)' },
        { id: 'b8', label: 'Produce, or increase the production of, solid or liquid wastes (e.g. water, medical, domestic or construction wastes)?', guidance: 'O.P 4.01 (Environmental Assessment)' },
      ],
    },
    {
      id: 'C',
      title: 'Land acquisition and access to resources — Will the sub-projects:',
      footer: 'If the answer to any of the questions 19–23 is "Yes", please consult the ESMF and, if needed, prepare a Resettlement Action Plan (RAP)',
      questions: [
        { id: 'c1', label: 'Require that land (public or private) be acquired (temporarily or permanently) for its development?', guidance: '4.12 (Involuntary Resettlement) — Excluded from Project Scope' },
        { id: 'c2', label: 'Use land that is currently occupied or regularly used for productive purposes (e.g. gardening, farming, pasture, fishing locations, forests)', guidance: '4.12 (Involuntary Resettlement) — Excluded from Project Scope' },
        { id: 'c3', label: 'Displace individuals, families or businesses?', guidance: '4.12 (Involuntary Resettlement) — Excluded from Project Scope' },
        { id: 'c4', label: 'Result in the temporary or permanent loss of crops, fruit trees or household infrastructure such as granaries, outside toilets and kitchens?', guidance: '4.12 (Involuntary Resettlement) — Excluded from Project Scope' },
        { id: 'c5', label: 'Result in the involuntary restriction of access by people to legally designated parks and protected areas?', guidance: '4.12 (Involuntary Resettlement) — Excluded from Project Scope' },
      ],
    },
    {
      id: 'D',
      title: 'Pesticides and agricultural chemicals — Will the sub-projects:',
      footer: 'If the answer to question 24 is "Yes", please consult the ESMF and, if needed, prepare a Pest Management Plan (PMP).',
      questions: [
        { id: 'd1', label: 'Involve the use of pesticides or other agricultural chemicals, or increase existing use?', guidance: 'OP 4.09 Pest Management' },
      ],
    },
  ],
} as const;

// ============================================================================
// Header fields (printed in the PDF header)
// ============================================================================
export const ESSF_HEADER_FIELDS = [
  'district',                    // pulled from enterprise
  'round_of_funding',            // pulled from enterprise.round_id
  'date',                        // user-set
  'sub_project_representative',  // user-typed (often the principal applicant)
  'sub_project_name',            // pulled from enterprise.applicant_organisation_name
  'sub_project_address',         // user-typed (free-text, often village/CC)
  'extension_team_representative', // user-typed
  'extension_team_address',      // user-typed (often resource_center)
] as const;

// ============================================================================
// Response shape stored in essf_submissions.responses jsonb
// ============================================================================
export interface EssfResponses {
  header?: Partial<Record<(typeof ESSF_HEADER_FIELDS)[number], string>>;
  site_sensitivity?: Partial<Record<string, (typeof ESSF_SITE_SENSITIVITY.ratings)[number]>>;
  completeness?: Partial<Record<string, (typeof ESSF_COMPLETENESS.options)[number]>>;
  checklist?: Partial<Record<string, (typeof ESSF_CHECKLIST.options)[number]>>;
  signed?: {
    extension_team_rep_name?: string;
    extension_team_rep_signed_at?: string; // ISO date
    sub_project_rep_name?: string;
    sub_project_rep_signed_at?: string;
  };
}
