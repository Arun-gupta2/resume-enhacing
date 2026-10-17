export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ResumeStatus = "draft" | "ready" | "archived";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; full_name: string | null; created_at: string; updated_at: string },
        { id: string; full_name?: string | null }
      >;
      resumes: Table<
        {
          id: string;
          user_id: string;
          title: string;
          status: ResumeStatus;
          template: "editorial" | "modern" | "compact";
          client_revision: number;
          original_file_path: string | null;
          original_file_name: string | null;
          original_media_type: string | null;
          original_file_size: number | null;
          current_version_id: string | null;
          created_at: string;
          updated_at: string;
        },
        { id?: string; user_id: string; title: string; status?: ResumeStatus; template?: "editorial" | "modern" | "compact"; client_revision?: number; original_file_path?: string | null; original_file_name?: string | null; original_media_type?: string | null; original_file_size?: number | null; current_version_id?: string | null }
      >;
      resume_versions: Table<
        {
          id: string;
          resume_id: string;
          user_id: string;
          version_number: number;
          variant_id: string | null;
          client_revision: number;
          content: Json;
          created_at: string;
        },
        { id?: string; resume_id: string; user_id: string; version_number: number; variant_id?: string | null; client_revision?: number; content?: Json }
      >;
      resume_variants: Table<
        {
          id: string;
          resume_id: string;
          user_id: string;
          job_description_id: string | null;
          name: string;
          template: "editorial" | "modern" | "compact";
          client_revision: number;
          current_version_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          resume_id: string;
          user_id: string;
          job_description_id?: string | null;
          name: string;
          template?: "editorial" | "modern" | "compact";
          client_revision?: number;
          current_version_id?: string | null;
        }
      >;
      job_descriptions: Table<
        {
          id: string;
          user_id: string;
          resume_id: string;
          title: string;
          company: string | null;
          description: string;
          created_at: string;
          updated_at: string;
        },
        { id?: string; user_id: string; resume_id: string; title: string; company?: string | null; description: string }
      >;
      analysis_results: Table<
        {
          id: string;
          user_id: string;
          resume_id: string;
          resume_version_id: string;
          resume_variant_id: string | null;
          job_description_id: string;
          score: number | null;
          matched_terms: Json;
          missing_terms: Json;
          explanation: Json;
          ats_report: Json;
          optimization_proposals: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          resume_id: string;
          resume_version_id: string;
          resume_variant_id?: string | null;
          job_description_id: string;
          score?: number | null;
          matched_terms?: Json;
          missing_terms?: Json;
          explanation?: Json;
          ats_report?: Json;
          optimization_proposals?: Json;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_resume: { Args: { p_title: string }; Returns: string };
      duplicate_resume: { Args: { p_resume_id: string; p_title: string }; Returns: string };
      create_resume_variant: { Args: { p_resume_id: string; p_job_description_id: string; p_name: string }; Returns: string };
      save_structured_resume_version: {
        Args: {
          p_resume_id: string;
          p_variant_id: string | null;
          p_client_revision: number;
          p_content: Json;
          p_template: "editorial" | "modern" | "compact";
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};