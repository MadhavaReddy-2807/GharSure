export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          customer_id: string;
          auth_user_id: string | null;
          phone_e164: string;
          phone_verified_at: string | null;
          full_name: string | null;
          display_name: string | null;
          city: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string;
          auth_user_id?: string | null;
          phone_e164: string;
          phone_verified_at?: string | null;
          full_name?: string | null;
          display_name?: string | null;
          city?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          auth_user_id?: string | null;
          phone_e164?: string;
          phone_verified_at?: string | null;
          full_name?: string | null;
          display_name?: string | null;
          city?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      otp_challenges: {
        Row: {
          id: string;
          phone_e164: string;
          otp_hash: string;
          attempts: number;
          max_attempts: number;
          resend_count: number;
          expires_at: string;
          verified_at: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone_e164: string;
          otp_hash: string;
          attempts?: number;
          max_attempts?: number;
          resend_count?: number;
          expires_at: string;
          verified_at?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone_e164?: string;
          otp_hash?: string;
          attempts?: number;
          max_attempts?: number;
          resend_count?: number;
          expires_at?: string;
          verified_at?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      customer_sessions: {
        Row: {
          id: string;
          customer_id: string;
          session_token_hash: string;
          expires_at: string;
          user_agent: string | null;
          ip_address: string | null;
          last_active_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          session_token_hash: string;
          expires_at: string;
          user_agent?: string | null;
          ip_address?: string | null;
          last_active_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          session_token_hash?: string;
          expires_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          last_active_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          event_type: string;
          phone_e164: string | null;
          customer_id: string | null;
          ip_address: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          phone_e164?: string | null;
          customer_id?: string | null;
          ip_address?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          phone_e164?: string | null;
          customer_id?: string | null;
          ip_address?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
