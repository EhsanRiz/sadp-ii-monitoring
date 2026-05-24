/**
 * Inspection Visit (compliance monitoring) — universal schema.
 *
 * Many per enterprise (one per inspection visit). Filled by Field Supervisor
 * (or M&E Officer on behalf of a Service Provider), approved by M&E Officer
 * or Team Leader.
 *
 * Source: ESMP COMPLIANCE MONITORING CHECKLIST FOR SERVICE PROVIDERS.docx
 * in OneDrive "Company Docs/ESMP forms". The docx is named "for Service
 * Providers" but per the workflow Ehsan defined, SPs don't use the app —
 * 4D Field Supervisors fill these on-site, recording the SP's name in the
 * inspected_by_name column on the row.
 *
 * 21 aspects across 3 lifecycle phases (Pre-Construction, Construction,
 * Operational). Each aspect gets one of 4 statuses + an optional comment.
 */

export const INSPECTION_SCHEMA_VERSION = 1;

export const INSPECTION_STATUSES = ['c', 'nc', 'pc', 'na'] as const;

export const INSPECTION_STATUS_LABELS: Record<(typeof INSPECTION_STATUSES)[number], string> = {
  c:  'Compliant',
  nc: 'Non-Compliant',
  pc: 'Partially Compliant',
  na: 'Not Applicable',
};

interface InspectionAspect {
  id: string;
  label: string;
  comment_hint?: string; // placeholder text for the comment field
}

interface InspectionPhase {
  id: 'pre_construction' | 'construction' | 'operational';
  title: string;
  aspects: InspectionAspect[];
}

export const INSPECTION_PHASES: InspectionPhase[] = [
  {
    id: 'pre_construction',
    title: 'Pre-Construction',
    aspects: [
      {
        id: 'screening_esmp',
        label: 'Project screened, ESMP developed and available on site',
        comment_hint: 'Describe the screening process and any identified environmental concerns.',
      },
      {
        id: 'community_sensitization',
        label: 'Has the local community been sensitized about the project?',
        comment_hint: 'Detail community engagement efforts and feedback received.',
      },
      {
        id: 'climatic_risks',
        label: 'Is the site susceptible to climatic risks (flooding / erosion)?',
        comment_hint: 'Describe terrain where project is located.',
      },
      {
        id: 'erosion_protection',
        label: 'Erosion / flooding protection',
        comment_hint: 'Describe measures to prevent erosion and flooding.',
      },
      {
        id: 'zoning_compliance',
        label: 'Is the site located within acceptable zoning by local authority?',
        comment_hint: 'Confirm compliance with zoning regulations.',
      },
    ],
  },
  {
    id: 'construction',
    title: 'Construction Phase',
    aspects: [
      {
        id: 'site_protected',
        label: 'Is site protected to ensure safety of community?',
        comment_hint: 'Describe safety measures. Are there warning signs / barricades?',
      },
      {
        id: 'community_impact',
        label: 'Do construction works affect community?',
        comment_hint: 'Are construction activities generating dust, noise, traffic?',
      },
      {
        id: 'worker_training',
        label: 'Are workers instructed appropriately?',
        comment_hint: 'Explain training programs or instructions provided to workers.',
      },
      {
        id: 'worker_sanitation',
        label: 'Are workers provided with sanitation facilities?',
        comment_hint: 'Describe the ablution facilities available or arrangements made.',
      },
      {
        id: 'potable_water',
        label: 'Potable water available on site?',
        comment_hint: 'Confirm availability and source of potable water.',
      },
      {
        id: 'construction_waste',
        label: 'Is construction waste properly handled and disposed?',
        comment_hint: 'Describe waste management practices for handling construction debris.',
      },
    ],
  },
  {
    id: 'operational',
    title: 'Operational Phase',
    aspects: [
      {
        id: 'site_waste_accumulation',
        label: 'Is there accumulation of waste on site?',
        comment_hint: 'Provide a detailed report on waste management practices.',
      },
      {
        id: 'liquid_waste_facilities',
        label: 'Are appropriate liquid waste management facilities (septic, etc.) available?',
        comment_hint: 'Describe liquid waste management facilities in place.',
      },
      {
        id: 'washout_facilities',
        label: 'Washout facilities? (Facilities for cleaning pesticide application equipment)',
        comment_hint: 'Provide details of washout facilities available on site.',
      },
      {
        id: 'chemical_storage',
        label: 'Are chemicals and pesticides properly stored?',
        comment_hint: 'Describe the storage facility. Is it secure, ventilated?',
      },
      {
        id: 'expired_chemicals',
        label: 'Are expired or empty chemical containers disposed of safely?',
        comment_hint: 'Describe disposal practices for expired or empty containers.',
      },
      {
        id: 'pest_management',
        label: 'Are chemical application and pest management practices appropriate?',
        comment_hint: 'Describe pest control measures used, who applies them, frequency.',
      },
      {
        id: 'pest_records',
        label: 'Are chemical and pest management records kept and updated?',
        comment_hint: 'Describe the record-keeping system for chemical application.',
      },
      {
        id: 'ppe_provided',
        label: 'Are appropriate Personal Protective Equipment (PPE) provided?',
        comment_hint: 'Specify the types of PPE provided (e.g., gloves, overalls, masks).',
      },
      {
        id: 'odour_nuisance',
        label: 'Is there obnoxious smell from the farm? Nuisances (smell, noise)?',
        comment_hint: 'Describe measures taken to prevent nuisances.',
      },
      {
        id: 'biosecurity',
        label: 'Are there biosecurity controls in place?',
        comment_hint: 'Describe the biosecurity measures put in place.',
      },
    ],
  },
];

// ============================================================================
// Response shape stored in inspection_visits.responses jsonb
// ============================================================================
export interface InspectionResponses {
  /** aspect_id → { status, comment } */
  aspects?: Record<
    string,
    {
      status?: (typeof INSPECTION_STATUSES)[number];
      comment?: string;
    }
  >;
  /** Optional header notes — top-level inspection observations */
  notes?: string;
}
