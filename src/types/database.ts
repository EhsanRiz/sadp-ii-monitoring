/**
 * Supabase database types — PLACEHOLDER.
 *
 * Regenerate from your linked Supabase project after running migrations:
 *
 *   pnpm dlx supabase gen types typescript --linked > src/types/database.ts
 *   # or
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * The placeholder below mirrors the Phase 1 schema (migrations 010-100) closely
 * enough that the app compiles before you've linked a Supabase project. The
 * shape (Row / Insert / Update / Relationships) matches `supabase gen types`
 * output so swapping to generated types is a drop-in replacement.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enum-like helpers (mirroring CHECK constraints)
// ---------------------------------------------------------------------------
export type AppRole = 'super_admin' | 'team_leader' | 'me_officer' | 'field_supervisor';
export type RoundStatus = 'upcoming' | 'active' | 'closed';
export type EnterpriseCategory = 'crops' | 'livestock' | 'aquaculture' | 'processing';
export type RegistrationCompleteness = 'minimal' | 'cover_page_ready';
export type EsmpStatus =
  | 'not_started'
  | 'pending_app_completion'
  | 'completed_uploaded'
  | 'completed_in_app';
export type ProcurementPlanStatus = 'not_started' | 'in_progress' | 'done';
export type BusinessPlanStatus =
  | 'not_started'
  | 'in_progress'
  | 'done_to_be_validated'
  | 'done_validated'
  | 'submitted'
  | 'validated_submitted';
export type Milestone1ReportStatus =
  | 'not_started'
  | 'in_progress'
  | 'done_not_submitted'
  | 'done_submitted';
export type DrillingStatus =
  | 'unknown'
  | 'not_needed'
  | 'pre_existing'
  | 'in_progress'
  | 'drilled'
  | 'not_drilled';
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';
export type SubmissionStatus = 'draft' | 'submitted' | 'approved';
export type EnterpriseEsmpComputedStatus = 'not_started' | 'in_progress' | 'complete' | 'legacy_pdf';

// ---------------------------------------------------------------------------
// Database shape — matches `supabase gen types` output
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      rounds: {
        Row: {
          id: number;
          name: string;
          status: RoundStatus;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id: number;
          name: string;
          status: RoundStatus;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          status?: RoundStatus;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          role: AppRole;
          full_name: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          role: AppRole;
          full_name: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          role?: AppRole;
          full_name?: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      districts: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          code?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      community_councils: {
        Row: {
          id: string;
          district_id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          district_id: string;
          // organization_id is set by the BEFORE trigger from the parent district,
          // so the client should leave it unset.
          organization_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          district_id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      resource_centers: {
        Row: {
          id: string;
          district_id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          district_id: string;
          organization_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          district_id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      villages: {
        Row: {
          id: string;
          district_id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          district_id: string;
          organization_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          district_id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      enterprise_types: {
        Row: {
          id: number;
          code: string;
          name: string;
          category: EnterpriseCategory;
          created_at: string;
        };
        Insert: {
          id: number;
          code: string;
          name: string;
          category: EnterpriseCategory;
          created_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          name?: string;
          category?: EnterpriseCategory;
          created_at?: string;
        };
        Relationships: [];
      };
      enterprises: {
        Row: {
          id: string;
          organization_id: string;
          round_id: number;
          registration_completeness: RegistrationCompleteness;
          enterprise_type_id: number;
          beneficiary_short_name: string;
          applicant_organisation_name: string;
          project_title: string | null;
          registration_number: string | null;
          period_start: string | null;
          period_end: string | null;
          total_project_cost_lsl: number | null;
          total_grant_lsl: number | null;
          current_grant_payment_lsl: number | null;
          principal_applicant_name: string | null;
          district_id: string;
          community_council_id: string | null;
          resource_center_id: string | null;
          village_id: string | null;
          location_detail: string | null;
          beneficiary_contact_phone: string | null;
          principal_applicant_signature_url: string | null;
          principal_applicant_signed_date: string | null;
          service_provider_name: string | null;
          service_provider_signature_url: string | null;
          service_provider_signed_date: string | null;
          cgp_received_date: string | null;
          cgp_officer_name: string | null;
          cgp_officer_signature_url: string | null;
          esmp_status: EsmpStatus;
          esmp_uploaded_pdf_url: string | null;
          procurement_plan_status: ProcurementPlanStatus;
          business_plan_status: BusinessPlanStatus;
          milestone1_report_status: Milestone1ReportStatus;
          drilling_status: DrillingStatus;
          budget_lsl: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          // organization_id is set by the geo-consistency trigger from the parent district
          organization_id?: string;
          round_id: number;
          registration_completeness?: RegistrationCompleteness;
          enterprise_type_id: number;
          beneficiary_short_name: string;
          applicant_organisation_name: string;
          project_title?: string | null;
          registration_number?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          total_project_cost_lsl?: number | null;
          total_grant_lsl?: number | null;
          current_grant_payment_lsl?: number | null;
          principal_applicant_name?: string | null;
          district_id: string;
          community_council_id?: string | null;
          resource_center_id?: string | null;
          village_id?: string | null;
          location_detail?: string | null;
          beneficiary_contact_phone?: string | null;
          principal_applicant_signature_url?: string | null;
          principal_applicant_signed_date?: string | null;
          service_provider_name?: string | null;
          service_provider_signature_url?: string | null;
          service_provider_signed_date?: string | null;
          cgp_received_date?: string | null;
          cgp_officer_name?: string | null;
          cgp_officer_signature_url?: string | null;
          esmp_status?: EsmpStatus;
          esmp_uploaded_pdf_url?: string | null;
          procurement_plan_status?: ProcurementPlanStatus;
          business_plan_status?: BusinessPlanStatus;
          milestone1_report_status?: Milestone1ReportStatus;
          drilling_status?: DrillingStatus;
          budget_lsl?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          round_id?: number;
          registration_completeness?: RegistrationCompleteness;
          enterprise_type_id?: number;
          beneficiary_short_name?: string;
          applicant_organisation_name?: string;
          project_title?: string | null;
          registration_number?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          total_project_cost_lsl?: number | null;
          total_grant_lsl?: number | null;
          current_grant_payment_lsl?: number | null;
          principal_applicant_name?: string | null;
          district_id?: string;
          community_council_id?: string | null;
          resource_center_id?: string | null;
          village_id?: string | null;
          location_detail?: string | null;
          beneficiary_contact_phone?: string | null;
          principal_applicant_signature_url?: string | null;
          principal_applicant_signed_date?: string | null;
          service_provider_name?: string | null;
          service_provider_signature_url?: string | null;
          service_provider_signed_date?: string | null;
          cgp_received_date?: string | null;
          cgp_officer_name?: string | null;
          cgp_officer_signature_url?: string | null;
          esmp_status?: EsmpStatus;
          esmp_uploaded_pdf_url?: string | null;
          procurement_plan_status?: ProcurementPlanStatus;
          business_plan_status?: BusinessPlanStatus;
          milestone1_report_status?: Milestone1ReportStatus;
          drilling_status?: DrillingStatus;
          budget_lsl?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          table_name: string;
          record_id: string;
          action: AuditAction;
          changed_by: string | null;
          changed_at: string;
          old_values: Json | null;
          new_values: Json | null;
          diff: Json | null;
          organization_id: string | null;
        };
        Insert: {
          id?: number;
          table_name: string;
          record_id: string;
          action: AuditAction;
          changed_by?: string | null;
          changed_at?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          diff?: Json | null;
          organization_id?: string | null;
        };
        Update: {
          id?: number;
          table_name?: string;
          record_id?: string;
          action?: AuditAction;
          changed_by?: string | null;
          changed_at?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          diff?: Json | null;
          organization_id?: string | null;
        };
        Relationships: [];
      };
    };
      essf_submissions: {
        Row: {
          id: string;
          enterprise_id: string;
          organization_id: string;
          schema_version: number;
          responses: Json;
          status: SubmissionStatus;
          filled_by: string | null;
          submitted_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enterprise_id: string;
          organization_id?: string;       // trigger sets it
          schema_version?: number;
          responses?: Json;
          status?: SubmissionStatus;
          filled_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          enterprise_id?: string;
          organization_id?: string;
          schema_version?: number;
          responses?: Json;
          status?: SubmissionStatus;
          filled_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      emmp_templates: {
        Row: {
          id: string;
          enterprise_type_ids: number[];
          title: string;
          version: string;
          schema: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          enterprise_type_ids: number[];
          title: string;
          version: string;
          schema: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          enterprise_type_ids?: number[];
          title?: string;
          version?: string;
          schema?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      emmp_submissions: {
        Row: {
          id: string;
          enterprise_id: string;
          organization_id: string;
          template_id: string;
          responses: Json;
          status: SubmissionStatus;
          filled_by: string | null;
          submitted_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enterprise_id: string;
          organization_id?: string;       // trigger sets it
          template_id: string;
          responses?: Json;
          status?: SubmissionStatus;
          filled_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          enterprise_id?: string;
          organization_id?: string;
          template_id?: string;
          responses?: Json;
          status?: SubmissionStatus;
          filled_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inspection_visits: {
        Row: {
          id: string;
          enterprise_id: string;
          organization_id: string;
          schema_version: number;
          inspected_by_name: string;
          visit_date: string;
          responses: Json;
          status: SubmissionStatus;
          filled_by: string | null;
          submitted_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enterprise_id: string;
          organization_id?: string;
          schema_version?: number;
          inspected_by_name: string;
          visit_date?: string;
          responses?: Json;
          status?: SubmissionStatus;
          filled_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          enterprise_id?: string;
          organization_id?: string;
          schema_version?: number;
          inspected_by_name?: string;
          visit_date?: string;
          responses?: Json;
          status?: SubmissionStatus;
          filled_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      enterprise_esmp_status: {
        Row: {
          enterprise_id: string;
          organization_id: string;
          computed_status: EnterpriseEsmpComputedStatus;
          essf_submission_id: string | null;
          essf_status: SubmissionStatus | null;
          emmp_submission_id: string | null;
          emmp_status: SubmissionStatus | null;
          emmp_template_id: string | null;
        };
        Relationships: [];
      };
      enterprise_m1_ready: {
        Row: {
          enterprise_id: string;
          organization_id: string;
          beneficiary_short_name: string;
          m1_ready: boolean;
          cover_page_ready: boolean;
          essf_status: string;
          emmp_status: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_org_id: { Args: Record<string, never>; Returns: string | null };
      current_user_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

// Convenience aliases so other files don't have to drill through Database.
export type OrganizationRow = Database['public']['Tables']['organizations']['Row'];
export type RoundRow = Database['public']['Tables']['rounds']['Row'];
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
export type DistrictRow = Database['public']['Tables']['districts']['Row'];
export type CommunityCouncilRow = Database['public']['Tables']['community_councils']['Row'];
export type ResourceCenterRow = Database['public']['Tables']['resource_centers']['Row'];
export type VillageRow = Database['public']['Tables']['villages']['Row'];
export type EnterpriseTypeRow = Database['public']['Tables']['enterprise_types']['Row'];
export type EnterpriseRow = Database['public']['Tables']['enterprises']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];
export type EssfSubmissionRow = Database['public']['Tables']['essf_submissions']['Row'];
export type EmmpTemplateRow = Database['public']['Tables']['emmp_templates']['Row'];
export type EmmpSubmissionRow = Database['public']['Tables']['emmp_submissions']['Row'];
export type InspectionVisitRow = Database['public']['Tables']['inspection_visits']['Row'];
export type EnterpriseEsmpStatusRow = Database['public']['Views']['enterprise_esmp_status']['Row'];
export type EnterpriseM1ReadyRow = Database['public']['Views']['enterprise_m1_ready']['Row'];
