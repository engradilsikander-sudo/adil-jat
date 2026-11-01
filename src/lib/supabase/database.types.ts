export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_area_permissions: {
        Row: {
          can_approve: boolean
          can_review: boolean
          can_view: boolean
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          is_active: boolean
          module_key: string
          notes: string | null
          scope: string
          taluka: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          can_approve?: boolean
          can_review?: boolean
          can_view?: boolean
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          is_active?: boolean
          module_key: string
          notes?: string | null
          scope: string
          taluka?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          can_approve?: boolean
          can_review?: boolean
          can_view?: boolean
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          notes?: string | null
          scope?: string
          taluka?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          action_label: string
          actor_email: string | null
          actor_user_id: string | null
          changed_data: Json | null
          created_at: string
          entity_id: string | null
          entity_schema: string
          entity_table: string
          id: string
          ip_address: string | null
          module_key: string
          new_data: Json | null
          old_data: Json | null
          record_label: string | null
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_label: string
          actor_email?: string | null
          actor_user_id?: string | null
          changed_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_schema?: string
          entity_table: string
          id?: string
          ip_address?: string | null
          module_key?: string
          new_data?: Json | null
          old_data?: Json | null
          record_label?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_label?: string
          actor_email?: string | null
          actor_user_id?: string | null
          changed_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_schema?: string
          entity_table?: string
          id?: string
          ip_address?: string | null
          module_key?: string
          new_data?: Json | null
          old_data?: Json | null
          record_label?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          published_at: string | null
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string
          published_at?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          published_at?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          area: string
          assigned_department: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          cnic: string | null
          created_at: string
          details: string
          full_name: string
          id: string
          internal_remarks: string | null
          mobile: string
          photo_path: string | null
          priority: Database["public"]["Enums"]["complaint_priority"]
          public_remarks: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          tracking_no: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          area: string
          assigned_department?: string | null
          assigned_to?: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          cnic?: string | null
          created_at?: string
          details: string
          full_name: string
          id?: string
          internal_remarks?: string | null
          mobile: string
          photo_path?: string | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          public_remarks?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          tracking_no: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          area?: string
          assigned_department?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          cnic?: string | null
          created_at?: string
          details?: string
          full_name?: string
          id?: string
          internal_remarks?: string | null
          mobile?: string
          photo_path?: string | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          public_remarks?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          tracking_no?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          location: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      finance_donation_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      finance_donations: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          district: string | null
          donation_no: string | null
          donor_district_snapshot: string | null
          donor_father_name_snapshot: string | null
          donor_member_id: string | null
          donor_member_no_snapshot: string | null
          donor_name: string
          donor_name_snapshot: string | null
          donor_phone: string | null
          donor_taluka_snapshot: string | null
          donor_user_id: string | null
          id: string
          notes: string | null
          payment_method: string
          purpose: string
          receipt_file_path: string | null
          receipt_no: string | null
          rejected_at: string | null
          rejected_by: string | null
          status: string
          taluka: string | null
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          donation_no?: string | null
          donor_district_snapshot?: string | null
          donor_father_name_snapshot?: string | null
          donor_member_id?: string | null
          donor_member_no_snapshot?: string | null
          donor_name: string
          donor_name_snapshot?: string | null
          donor_phone?: string | null
          donor_taluka_snapshot?: string | null
          donor_user_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          purpose: string
          receipt_file_path?: string | null
          receipt_no?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          taluka?: string | null
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          donation_no?: string | null
          donor_district_snapshot?: string | null
          donor_father_name_snapshot?: string | null
          donor_member_id?: string | null
          donor_member_no_snapshot?: string | null
          donor_name?: string
          donor_name_snapshot?: string | null
          donor_phone?: string | null
          donor_taluka_snapshot?: string | null
          donor_user_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          purpose?: string
          receipt_file_path?: string | null
          receipt_no?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          taluka?: string | null
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_donations_donor_member_id_fkey"
            columns: ["donor_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          district: string | null
          document_path: string | null
          expense_title: string
          id: string
          linked_application_id: string | null
          linked_program_key: Database["public"]["Enums"]["program_key"] | null
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          paid_to: string
          payment_method: string
          receipt_no: string | null
          rejected_at: string | null
          rejected_by: string | null
          status: string
          taluka: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          document_path?: string | null
          expense_title: string
          id?: string
          linked_application_id?: string | null
          linked_program_key?: Database["public"]["Enums"]["program_key"] | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_to: string
          payment_method: string
          receipt_no?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          taluka?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          document_path?: string | null
          expense_title?: string
          id?: string
          linked_application_id?: string | null
          linked_program_key?: Database["public"]["Enums"]["program_key"] | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_to?: string
          payment_method?: string
          receipt_no?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          taluka?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_linked_application_id_fkey"
            columns: ["linked_application_id"]
            isOneToOne: false
            referencedRelation: "program_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_path: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          membership_fee_required: boolean
          address: string | null
          approved_at: string | null
          blood_group: string | null
          caste_branch: string | null
          cnic: string
          created_at: string
          date_of_birth: string | null
          declaration_accepted: boolean
          district: string
          education: string | null
          emergency_contact_mobile: string | null
          emergency_contact_name: string | null
          emergency_contact_relation: string | null
          father_name: string
          full_name: string
          gender: string | null
          id: string
          member_no: string | null
          mobile: string
          photo_url: string
          profession: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["member_status"]
          taluka: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          membership_fee_required?: boolean
          address?: string | null
          approved_at?: string | null
          blood_group?: string | null
          caste_branch?: string | null
          cnic: string
          created_at?: string
          date_of_birth?: string | null
          declaration_accepted?: boolean
          district: string
          education?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relation?: string | null
          father_name: string
          full_name: string
          gender?: string | null
          id?: string
          member_no?: string | null
          mobile: string
          photo_url: string
          profession?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          taluka?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          membership_fee_required?: boolean
          address?: string | null
          approved_at?: string | null
          blood_group?: string | null
          caste_branch?: string | null
          cnic?: string
          created_at?: string
          date_of_birth?: string | null
          declaration_accepted?: boolean
          district?: string
          education?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relation?: string | null
          father_name?: string
          full_name?: string
          gender?: string | null
          id?: string
          member_no?: string | null
          mobile?: string
          photo_url?: string
          profession?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          taluka?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      membership_payments: {
        Row: {
          admin_note: string | null
          base_amount: number
          created_at: string
          currency: string
          gateway_provider: string | null
          gateway_reference: string | null
          id: string
          member_id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["membership_payment_method"]
          receipt_file_name: string | null
          receipt_mime_type: string | null
          receipt_path: string | null
          receipt_size_bytes: number | null
          receipt_uploaded_at: string | null
          status: Database["public"]["Enums"]["membership_payment_status"]
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          base_amount?: number
          created_at?: string
          currency?: string
          gateway_provider?: string | null
          gateway_reference?: string | null
          id?: string
          member_id: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["membership_payment_method"]
          receipt_file_name?: string | null
          receipt_mime_type?: string | null
          receipt_path?: string | null
          receipt_size_bytes?: number | null
          receipt_uploaded_at?: string | null
          status?: Database["public"]["Enums"]["membership_payment_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          base_amount?: number
          created_at?: string
          currency?: string
          gateway_provider?: string | null
          gateway_reference?: string | null
          id?: string
          member_id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["membership_payment_method"]
          receipt_file_name?: string | null
          receipt_mime_type?: string | null
          receipt_path?: string | null
          receipt_size_bytes?: number | null
          receipt_uploaded_at?: string | null
          status?: Database["public"]["Enums"]["membership_payment_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          category: string
          content: string
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          content: string
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          content?: string
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          action_url: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          push_delivery_count: number
          recipient_count: number
          recipient_limit: number
          target_district: string | null
          target_status: string
          target_taluka: string | null
          title: string
        }
        Insert: {
          action_url?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          push_delivery_count?: number
          recipient_count?: number
          recipient_limit?: number
          target_district?: string | null
          target_status?: string
          target_taluka?: string | null
          title: string
        }
        Update: {
          action_url?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          push_delivery_count?: number
          recipient_count?: number
          recipient_limit?: number
          target_district?: string | null
          target_status?: string
          target_taluka?: string | null
          title?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          finance_updates: boolean
          general_updates: boolean
          membership_updates: boolean
          program_updates: boolean
          updated_at: string
          user_id: string
          web_push_enabled: boolean
        }
        Insert: {
          created_at?: string
          finance_updates?: boolean
          general_updates?: boolean
          membership_updates?: boolean
          program_updates?: boolean
          updated_at?: string
          user_id: string
          web_push_enabled?: boolean
        }
        Update: {
          created_at?: string
          finance_updates?: boolean
          general_updates?: boolean
          membership_updates?: boolean
          program_updates?: boolean
          updated_at?: string
          user_id?: string
          web_push_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_committee_members: {
        Row: {
          appointment_notes: string | null
          committee_id: string
          created_at: string
          created_by: string | null
          designation_id: string | null
          designation_title: string
          district_snapshot: string | null
          father_name_snapshot: string | null
          full_name_snapshot: string
          id: string
          member_id: string
          member_no_snapshot: string | null
          sort_order: number
          status: string
          taluka_snapshot: string | null
          tenure_end: string | null
          tenure_start: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_notes?: string | null
          committee_id: string
          created_at?: string
          created_by?: string | null
          designation_id?: string | null
          designation_title: string
          district_snapshot?: string | null
          father_name_snapshot?: string | null
          full_name_snapshot: string
          id?: string
          member_id: string
          member_no_snapshot?: string | null
          sort_order?: number
          status?: string
          taluka_snapshot?: string | null
          tenure_end?: string | null
          tenure_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_notes?: string | null
          committee_id?: string
          created_at?: string
          created_by?: string | null
          designation_id?: string | null
          designation_title?: string
          district_snapshot?: string | null
          father_name_snapshot?: string | null
          full_name_snapshot?: string
          id?: string
          member_id?: string
          member_no_snapshot?: string | null
          sort_order?: number
          status?: string
          taluka_snapshot?: string | null
          tenure_end?: string | null
          tenure_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "organization_committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_committee_members_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "organization_designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_committee_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_committees: {
        Row: {
          committee_type: string
          created_at: string
          created_by: string | null
          district: string | null
          division: string | null
          id: string
          name: string
          notes: string | null
          public_display: boolean
          status: string
          taluka: string | null
          tenure_end: string | null
          tenure_start: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          committee_type: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          division?: string | null
          id?: string
          name: string
          notes?: string | null
          public_display?: boolean
          status?: string
          taluka?: string | null
          tenure_end?: string | null
          tenure_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          committee_type?: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          division?: string | null
          id?: string
          name?: string
          notes?: string | null
          public_display?: boolean
          status?: string
          taluka?: string | null
          tenure_end?: string | null
          tenure_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      organization_designations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          scope: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          scope: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          scope?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      profile_update_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          current_snapshot: Json
          id: string
          member_id: string
          member_name: string
          member_no: string | null
          member_note: string | null
          requested_changes: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source_district: string
          source_taluka: string | null
          status: string
          target_district: string
          target_taluka: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          current_snapshot: Json
          id?: string
          member_id: string
          member_name: string
          member_no?: string | null
          member_note?: string | null
          requested_changes: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_district: string
          source_taluka?: string | null
          status?: string
          target_district: string
          target_taluka?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          current_snapshot?: Json
          id?: string
          member_id?: string
          member_name?: string
          member_no?: string | null
          member_note?: string | null
          requested_changes?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_district?: string
          source_taluka?: string | null
          status?: string
          target_district?: string
          target_taluka?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_update_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      program_admin_assignments: {
        Row: {
          can_approve: boolean
          can_mark_completed: boolean
          can_review: boolean
          can_view: boolean
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          program_key: Database["public"]["Enums"]["program_key"]
          taluka: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve?: boolean
          can_mark_completed?: boolean
          can_review?: boolean
          can_view?: boolean
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          program_key: Database["public"]["Enums"]["program_key"]
          taluka?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve?: boolean
          can_mark_completed?: boolean
          can_review?: boolean
          can_view?: boolean
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          program_key?: Database["public"]["Enums"]["program_key"]
          taluka?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_application_counters: {
        Row: {
          last_seq: number
          program_key: Database["public"]["Enums"]["program_key"]
          updated_at: string
          year: number
        }
        Insert: {
          last_seq?: number
          program_key: Database["public"]["Enums"]["program_key"]
          updated_at?: string
          year: number
        }
        Update: {
          last_seq?: number
          program_key?: Database["public"]["Enums"]["program_key"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      program_applications: {
        Row: {
          address: string | null
          admin_remarks: string | null
          applicant_cnic: string | null
          applicant_name: string
          applicant_user_id: string
          application_no: string | null
          approved_amount: number | null
          approved_at: string | null
          assigned_admin_id: string | null
          completed_at: string | null
          created_at: string
          details: Json
          district: string | null
          email: string | null
          id: string
          member_id: string | null
          membership_no: string
          phone: string
          program_key: Database["public"]["Enums"]["program_key"]
          relationship_to_member: Database["public"]["Enums"]["member_relationship"]
          reviewed_at: string | null
          status: Database["public"]["Enums"]["program_application_status"]
          submitted_at: string
          taluka: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_remarks?: string | null
          applicant_cnic?: string | null
          applicant_name: string
          applicant_user_id: string
          application_no?: string | null
          approved_amount?: number | null
          approved_at?: string | null
          assigned_admin_id?: string | null
          completed_at?: string | null
          created_at?: string
          details?: Json
          district?: string | null
          email?: string | null
          id?: string
          member_id?: string | null
          membership_no: string
          phone: string
          program_key: Database["public"]["Enums"]["program_key"]
          relationship_to_member?: Database["public"]["Enums"]["member_relationship"]
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["program_application_status"]
          submitted_at?: string
          taluka?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_remarks?: string | null
          applicant_cnic?: string | null
          applicant_name?: string
          applicant_user_id?: string
          application_no?: string | null
          approved_amount?: number | null
          approved_at?: string | null
          assigned_admin_id?: string | null
          completed_at?: string | null
          created_at?: string
          details?: Json
          district?: string | null
          email?: string | null
          id?: string
          member_id?: string | null
          membership_no?: string
          phone?: string
          program_key?: Database["public"]["Enums"]["program_key"]
          relationship_to_member?: Database["public"]["Enums"]["member_relationship"]
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["program_application_status"]
          submitted_at?: string
          taluka?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_applications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      program_documents: {
        Row: {
          admin_note: string | null
          application_id: string
          created_at: string
          document_type: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          is_verified: boolean
          mime_type: string | null
          program_key: Database["public"]["Enums"]["program_key"]
          updated_at: string
          uploaded_by: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_note?: string | null
          application_id: string
          created_at?: string
          document_type: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_verified?: boolean
          mime_type?: string | null
          program_key: Database["public"]["Enums"]["program_key"]
          updated_at?: string
          uploaded_by: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_note?: string | null
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_verified?: boolean
          mime_type?: string | null
          program_key?: Database["public"]["Enums"]["program_key"]
          updated_at?: string
          uploaded_by?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "program_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          disabled_at: string | null
          disabled_reason: string | null
          enabled: boolean
          endpoint: string
          failure_count: number
          id: string
          last_failure_at: string | null
          last_seen_at: string
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          enabled?: boolean
          endpoint: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_seen_at?: string
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          enabled?: boolean
          endpoint?: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_seen_at?: string
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      web_push_deliveries: {
        Row: {
          attempts: number
          created_at: string
          failed_at: string | null
          http_status: number | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          notification_id: string
          sent_at: string | null
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          failed_at?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id: string
          sent_at?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          failed_at?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id?: string
          sent_at?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_push_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_push_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      health_application_summaries: {
        Row: Pick<Database['public']['Tables']['program_applications']['Row'], 'id' | 'application_no' | 'applicant_name' | 'membership_no' | 'relationship_to_member' | 'phone' | 'district' | 'taluka' | 'program_key' | 'status' | 'assigned_admin_id' | 'approved_amount' | 'submitted_at' | 'created_at' | 'details'>
        Relationships: []
      }
    }
    Functions: {
      get_public_committee_directory: { Args: { _committee_id?: string }; Returns: Json }
      submit_membership_application_500: { Args: { _payload: Json; _receipt?: Json }; Returns: string }
      review_membership_payment_500: { Args: { _member_id: string; _reviewer: string; _status?: Database['public']['Enums']['membership_payment_status']; _note?: string; _receipt?: Json; _payment_id?: string }; Returns: Database['public']['Tables']['membership_payments']['Row'] }

      consume_verification_budget_v2: { Args: { _resource: string; _client: string }; Returns: boolean }
      lookup_public_office_bearer: { Args: { _card_id: string }; Returns: Json }
      admin_email_delivery_health: { Args: Record<string, never>; Returns: Json }
      retry_notification_email_delivery: { Args: { _delivery_id: string }; Returns: boolean }
      consume_public_verification_budget: { Args: { _member_no: string }; Returns: boolean }
      admin_send_bulk_notification: {
        Args: {
          _action_url?: string
          _category?: string
          _district?: string
          _member_status?: string
          _message: string
          _recipient_limit?: number
          _taluka?: string
          _title: string
        }
        Returns: Json
      }
      admin_area_permission_matches: {
        Args: {
          _action?: string
          _district: string
          _module_key: string
          _taluka: string
        }
        Returns: boolean
      }
      update_member_application_as_reviewer: {
        Args: { _member_id: string; _payload: Json; _reviewed_by: string }
        Returns: Database["public"]["Tables"]["members"]["Row"]
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_member: {
        Args: { _member_id: string; _reviewed_by?: string }
        Returns: {
          address: string | null
          approved_at: string | null
          blood_group: string | null
          caste_branch: string | null
          cnic: string
          created_at: string
          date_of_birth: string | null
          declaration_accepted: boolean
          district: string
          education: string | null
          emergency_contact_mobile: string | null
          emergency_contact_name: string | null
          emergency_contact_relation: string | null
          father_name: string
          full_name: string
          gender: string | null
          id: string
          member_no: string | null
          mobile: string
          photo_url: string
          profession: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["member_status"]
          taluka: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      audit_action_label: {
        Args: { _action: string; _row_data: Json; _table_name: string }
        Returns: string
      }
      audit_jsonb_diff: { Args: { _new: Json; _old: Json }; Returns: Json }
      audit_module_for_record: {
        Args: { _row_data: Json; _table_name: string }
        Returns: string
      }
      audit_record_label: {
        Args: { _row_data: Json; _table_name: string }
        Returns: string
      }
      audit_redact_jsonb: { Args: { _data: Json }; Returns: Json }
      cancel_profile_update_request: {
        Args: { _request_id: string }
        Returns: Database["public"]["Tables"]["profile_update_requests"]["Row"]
        SetofOptions: {
          from: "*"
          to: "profile_update_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_notification: {
        Args: {
          _action_url?: string
          _category?: string
          _message: string
          _related_id?: string
          _related_type?: string
          _title: string
          _user_id: string
        }
        Returns: string
      }
      review_profile_update_request: {
        Args: {
          _admin_note?: string
          _decision: string
          _request_id: string
        }
        Returns: Database["public"]["Tables"]["profile_update_requests"]["Row"]
        SetofOptions: {
          from: "*"
          to: "profile_update_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_profile_update_request: {
        Args: {
          _member_note?: string
          _request_id?: string
          _requested_changes: Json
        }
        Returns: Database["public"]["Tables"]["profile_update_requests"]["Row"]
        SetofOptions: {
          from: "*"
          to: "profile_update_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_can_access_area_module: {
        Args: { _action?: string; _module_key: string }
        Returns: boolean
      }
      current_user_can_access_finance_area: {
        Args: { _action?: string; _district?: string; _taluka?: string }
        Returns: boolean
      }
      current_user_can_access_membership_area: {
        Args: { _action?: string; _district?: string; _taluka?: string }
        Returns: boolean
      }
      current_user_can_approve_program: {
        Args: {
          _district?: string
          _program_key: Database["public"]["Enums"]["program_key"]
          _taluka?: string
        }
        Returns: boolean
      }
      current_user_can_manage_cms: { Args: never; Returns: boolean }
      current_user_can_manage_finance: { Args: never; Returns: boolean }
      current_user_can_manage_membership: { Args: never; Returns: boolean }
      current_user_can_manage_organization: { Args: never; Returns: boolean }
      current_user_can_manage_program: {
        Args: {
          _district?: string
          _program_key: Database["public"]["Enums"]["program_key"]
          _taluka?: string
        }
        Returns: boolean
      }
      current_user_can_mark_completed_program: {
        Args: {
          _district?: string
          _program_key: Database["public"]["Enums"]["program_key"]
          _taluka?: string
        }
        Returns: boolean
      }
      current_user_can_review_program: {
        Args: {
          _district?: string
          _program_key: Database["public"]["Enums"]["program_key"]
          _taluka?: string
        }
        Returns: boolean
      }
      current_user_can_view_audit_logs: { Args: never; Returns: boolean }
      current_user_can_view_donor_leaderboard: { Args: never; Returns: boolean }
      current_user_can_view_finance_audit_log: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: boolean
      }
      current_user_can_view_program: {
        Args: {
          _district?: string
          _program_key: Database["public"]["Enums"]["program_key"]
          _taluka?: string
        }
        Returns: boolean
      }
      current_user_has_role: { Args: { _role: string }; Returns: boolean }
      current_user_is_admin_or_super_admin: { Args: never; Returns: boolean }
      current_user_is_approved_member: { Args: never; Returns: boolean }
      current_user_is_super_admin: { Args: never; Returns: boolean }
      delete_admin_area_permission: {
        Args: { _permission_id: string }
        Returns: boolean
      }
      get_area_permissions_for_user: {
        Args: { _user_id: string }
        Returns: {
          can_approve: boolean
          can_review: boolean
          can_view: boolean
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          is_active: boolean
          module_key: string
          notes: string | null
          scope: string
          taluka: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_area_permissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_audit_logs: {
        Args: {
          _actor_user_id?: string
          _entity_table?: string
          _limit?: number
          _module_key?: string
          _query?: string
        }
        Returns: {
          action: string
          action_label: string
          actor_email: string
          actor_user_id: string
          changed_data: Json
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          ip_address: string
          module_key: string
          new_data: Json
          old_data: Json
          record_label: string
          user_agent: string
        }[]
      }
      get_complaint_public: {
        Args: { p_mobile: string; p_tracking_no: string }
        Returns: {
          area: string
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          public_remarks: string
          status: Database["public"]["Enums"]["complaint_status"]
          tracking_no: string
          updated_at: string
          ward: string
        }[]
      }
      get_donor_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          donation_count: number
          donor_district: string
          donor_father_name: string
          donor_member_id: string
          donor_member_no: string
          donor_name: string
          donor_taluka: string
          first_approved_at: string
          latest_approved_at: string
          purposes: string[]
          total_donated: number
        }[]
      }
      get_my_area_permissions: {
        Args: never
        Returns: {
          can_approve: boolean
          can_review: boolean
          can_view: boolean
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          is_active: boolean
          module_key: string
          notes: string | null
          scope: string
          taluka: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_area_permissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
      reject_member: {
        Args: {
          _member_id: string
          _rejection_reason: string
          _reviewed_by?: string
        }
        Returns: {
          address: string | null
          approved_at: string | null
          blood_group: string | null
          caste_branch: string | null
          cnic: string
          created_at: string
          date_of_birth: string | null
          declaration_accepted: boolean
          district: string
          education: string | null
          emergency_contact_mobile: string | null
          emergency_contact_name: string | null
          emergency_contact_relation: string | null
          father_name: string
          full_name: string
          gender: string | null
          id: string
          member_no: string | null
          mobile: string
          photo_url: string
          profession: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["member_status"]
          taluka: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_web_push_delivery: {
        Args: { _delivery_id: string }
        Returns: boolean
      }
      role_management_assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      role_management_remove_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      role_management_search_users: {
        Args: { _query?: string }
        Returns: {
          auth_created_at: string
          email: string
          member_full_name: string
          member_no: string
          member_status: string
          roles: string[]
          user_id: string
        }[]
      }
      search_users_for_area_permissions: {
        Args: { _limit?: number; _query?: string }
        Returns: {
          active_permissions_count: number
          district: string
          email: string
          father_name: string
          full_name: string
          member_id: string
          member_no: string
          roles: string[]
          taluka: string
          user_id: string
        }[]
      }
      submit_complaint: {
        Args: {
          p_area: string
          p_category: Database["public"]["Enums"]["complaint_category"]
          p_cnic: string
          p_details: string
          p_full_name: string
          p_mobile: string
          p_photo_path: string
          p_ward: string
        }
        Returns: {
          tracking_no: string
        }[]
      }
      upsert_admin_area_permission: {
        Args: {
          _can_approve: boolean
          _can_review: boolean
          _can_view: boolean
          _district: string
          _is_active: boolean
          _module_key: string
          _notes: string
          _permission_id: string
          _scope: string
          _taluka: string
          _user_id: string
        }
        Returns: {
          can_approve: boolean
          can_review: boolean
          can_view: boolean
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          is_active: boolean
          module_key: string
          notes: string | null
          scope: string
          taluka: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "admin_area_permissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_membership_no: { Args: { _membership_no: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "super_admin"
        | "membership_admin"
        | "education_admin"
        | "health_admin"
        | "employment_admin"
        | "ration_admin"
        | "welfare_admin"
        | "finance_admin"
        | "chairman"
        | "staff"
      complaint_category:
        | "sanitation"
        | "street_lights"
        | "drainage"
        | "water_supply"
        | "roads"
        | "encroachment"
        | "parks"
        | "birth_death_record"
        | "other"
      complaint_priority: "low" | "normal" | "high" | "urgent"
      complaint_status:
        | "submitted"
        | "received"
        | "in_progress"
        | "resolved"
        | "rejected"
      member_relationship:
        | "self"
        | "son"
        | "daughter"
        | "father"
        | "mother"
        | "brother"
        | "sister"
        | "wife"
        | "husband"
        | "guardian"
        | "other"
      member_status: "pending" | "approved" | "rejected"
      membership_payment_method:
        | "manual"
        | "jazzcash"
        | "easypaisa"
        | "bank"
        | "gateway"
      membership_payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "cancelled"
        | "refunded"
        | "waived"
      program_application_status:
        | "submitted"
        | "under_review"
        | "need_more_info"
        | "approved"
        | "rejected"
        | "paid_completed"
        | "completed"
      program_key:
        | "membership"
        | "education"
        | "health"
        | "employment"
        | "ration"
        | "welfare"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "super_admin",
        "membership_admin",
        "education_admin",
        "health_admin",
        "employment_admin",
        "ration_admin",
        "welfare_admin",
        "finance_admin",
        "chairman",
        "staff",
      ],
      complaint_category: [
        "sanitation",
        "street_lights",
        "drainage",
        "water_supply",
        "roads",
        "encroachment",
        "parks",
        "birth_death_record",
        "other",
      ],
      complaint_priority: ["low", "normal", "high", "urgent"],
      complaint_status: [
        "submitted",
        "received",
        "in_progress",
        "resolved",
        "rejected",
      ],
      member_relationship: [
        "self",
        "son",
        "daughter",
        "father",
        "mother",
        "brother",
        "sister",
        "wife",
        "husband",
        "guardian",
        "other",
      ],
      member_status: ["pending", "approved", "rejected"],
      membership_payment_method: [
        "manual",
        "jazzcash",
        "easypaisa",
        "bank",
        "gateway",
      ],
      membership_payment_status: [
        "pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "waived",
      ],
      program_application_status: [
        "submitted",
        "under_review",
        "need_more_info",
        "approved",
        "rejected",
        "paid_completed",
        "completed",
      ],
      program_key: [
        "membership",
        "education",
        "health",
        "employment",
        "ration",
        "welfare",
      ],
    },
  },
} as const

