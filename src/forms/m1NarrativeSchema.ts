/**
 * M1 Narrative Progress Report — Section II of every Milestone 1 report.
 *
 * Seven fixed headings, free-text body per section. These headings are
 * word-for-word identical across every M1 report we've seen in the
 * OneDrive samples folder, so they're hard-coded in app rather than
 * stored in the database.
 *
 * Stored on m1_submissions.narrative as: { [section.id]: "free text body" }
 */

export const M1_NARRATIVE_SCHEMA_VERSION = 1;

export interface M1NarrativeSection {
  id: string;
  number: string;        // "1.", "2." for display
  title: string;
  helper?: string;       // gentle prompt for the field supervisor
}

export const M1_NARRATIVE_SECTIONS: M1NarrativeSection[] = [
  {
    id: 'executive_summary',
    number: '1.',
    title: 'EXECUTIVE SUMMARY',
    helper:
      'High-level summary of Milestone 1 activities. Mention what was signed, what was procured/built, and the headline financial movements.',
  },
  {
    id: 'technical_activities',
    number: '2.',
    title: 'IMPLEMENTATION OF TECHNICAL ACTIVITIES',
    helper:
      'Concrete physical works delivered against the M1 budget — drilling, construction, equipment installation, etc. Flag anything that slipped to M2.',
  },
  {
    id: 'technology_transfer',
    number: '3.',
    title: 'IMPLEMENTATION OF TECHNOLOGY TRANSFER',
    helper:
      'Training, mentoring, knowledge sharing delivered in this period. If technology transfer is scheduled for later milestones, say so here.',
  },
  {
    id: 'outputs_results',
    number: '4.',
    title: 'PROJECT OUTPUTS AND RESULTS',
    helper:
      'Outputs of M1 — line up against the M1 budget: which suppliers were paid for what, what was delivered, what is partially paid pending completion.',
  },
  {
    id: 'partnership_cooperation',
    number: '5.',
    title: 'PARTNERSHIP AND COOPERATION',
    helper:
      'Relationship between the Project Field Officer, Service Provider, and the beneficiary. Note any cooperation issues or particularly good engagements.',
  },
  {
    id: 'problems_solutions',
    number: '6.',
    title: 'PROBLEMS AND POSSIBLE SOLUTIONS',
    helper:
      'Specific problems encountered in M1 and what was/will be done about them. "No problems" is acceptable.',
  },
  {
    id: 'recommendations_mgp',
    number: '7.',
    title: 'RECOMMENDATIONS AND REQUESTS TO THE MGP',
    helper:
      'Requests to the Matching Grants Programme (MGP). E.g. requests for training, process changes, etc.',
  },
];

/** Response shape stored on m1_submissions.narrative jsonb. */
export type M1NarrativeResponses = Partial<Record<string, string>>;
