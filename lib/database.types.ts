export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      collector_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: number
          listings_seen: number
          platform_id: string
          started_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: never
          listings_seen?: number
          platform_id: string
          started_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: never
          listings_seen?: number
          platform_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collector_runs_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      listing_price_history: {
        Row: {
          id: number
          listing_id: string
          observed_at: string
          price: number
        }
        Insert: {
          id?: never
          listing_id: string
          observed_at?: string
          price: number
        }
        Update: {
          id?: never
          listing_id?: string
          observed_at?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_status_history: {
        Row: {
          id: number
          listing_id: string
          new_status: string
          observed_at: string
          old_status: string
          reason: string | null
        }
        Insert: {
          id?: never
          listing_id: string
          new_status: string
          observed_at?: string
          old_status: string
          reason?: string | null
        }
        Update: {
          id?: never
          listing_id?: string
          new_status?: string
          observed_at?: string
          old_status?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_status_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_traits: {
        Row: {
          created_at: string
          listing_id: string
          source_text: string | null
          trait_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          source_text?: string | null
          trait_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          source_text?: string | null
          trait_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_traits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_traits_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          bundle_count: number | null
          classification_source: string
          created_at: string
          currency: string
          current_price: number | null
          external_id: string | null
          first_seen_at: string
          id: string
          image_url: string | null
          last_checked_at: string
          last_seen_at: string
          morph_id: string | null
          original_description: string | null
          original_title: string
          original_url: string
          platform_id: string
          price_type: string
          raw_data: Json
          sex: string
          sold_detected_at: string | null
          status: string
          updated_at: string
          weight_g: number | null
        }
        Insert: {
          bundle_count?: number | null
          classification_source?: string
          created_at?: string
          currency?: string
          current_price?: number | null
          external_id?: string | null
          first_seen_at?: string
          id?: string
          image_url?: string | null
          last_checked_at?: string
          last_seen_at?: string
          morph_id?: string | null
          original_description?: string | null
          original_title: string
          original_url: string
          platform_id: string
          price_type?: string
          raw_data?: Json
          sex?: string
          sold_detected_at?: string | null
          status?: string
          updated_at?: string
          weight_g?: number | null
        }
        Update: {
          bundle_count?: number | null
          classification_source?: string
          created_at?: string
          currency?: string
          current_price?: number | null
          external_id?: string | null
          first_seen_at?: string
          id?: string
          image_url?: string | null
          last_checked_at?: string
          last_seen_at?: string
          morph_id?: string | null
          original_description?: string | null
          original_title?: string
          original_url?: string
          platform_id?: string
          price_type?: string
          raw_data?: Json
          sex?: string
          sold_detected_at?: string | null
          status?: string
          updated_at?: string
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_morph_id_fkey"
            columns: ["morph_id"]
            isOneToOne: false
            referencedRelation: "morphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      morphs: {
        Row: {
          aliases: Json
          created_at: string
          display_order: number
          id: string
          name_en: string | null
          name_ko: string
          representative_image: string | null
          slug: string
          updated_at: string
          visible_on_home: boolean
        }
        Insert: {
          aliases?: Json
          created_at?: string
          display_order?: number
          id?: string
          name_en?: string | null
          name_ko: string
          representative_image?: string | null
          slug: string
          updated_at?: string
          visible_on_home?: boolean
        }
        Update: {
          aliases?: Json
          created_at?: string
          display_order?: number
          id?: string
          name_en?: string | null
          name_ko?: string
          representative_image?: string | null
          slug?: string
          updated_at?: string
          visible_on_home?: boolean
        }
        Relationships: []
      }
      platform_fulfillment_options: {
        Row: {
          applies_to: string
          availability: string
          created_at: string
          evidence_url: string
          id: string
          mode: string
          platform_id: string
          summary: string
          updated_at: string
          verified_at: string
        }
        Insert: {
          applies_to: string
          availability: string
          created_at?: string
          evidence_url: string
          id?: string
          mode: string
          platform_id: string
          summary: string
          updated_at?: string
          verified_at: string
        }
        Update: {
          applies_to?: string
          availability?: string
          created_at?: string
          evidence_url?: string
          id?: string
          mode?: string
          platform_id?: string
          summary?: string
          updated_at?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fulfillment_options_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          collector_type: string
          created_at: string
          homepage_url: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          collector_type: string
          created_at?: string
          homepage_url: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          collector_type?: string
          created_at?: string
          homepage_url?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_evidence_candidates: {
        Row: {
          cited_urls: Json
          claimed_morph: string | null
          claimed_price_krw: number
          claimed_sex: string | null
          claimed_status: string
          claimed_weight_g: number | null
          created_at: string
          evidence: Json
          first_seen_at: string
          hostname: string
          id: string
          last_checked_at: string | null
          last_seen_at: string
          model: string
          model_confidence: string
          page_http_status: number | null
          platform_id: string | null
          provider: string
          rejection_reason: string | null
          response_id: string | null
          robots_status: string
          search_query: string
          source_url: string
          times_seen: number
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          cited_urls?: Json
          claimed_morph?: string | null
          claimed_price_krw: number
          claimed_sex?: string | null
          claimed_status: string
          claimed_weight_g?: number | null
          created_at?: string
          evidence?: Json
          first_seen_at?: string
          hostname: string
          id?: string
          last_checked_at?: string | null
          last_seen_at?: string
          model: string
          model_confidence: string
          page_http_status?: number | null
          platform_id?: string | null
          provider?: string
          rejection_reason?: string | null
          response_id?: string | null
          robots_status?: string
          search_query: string
          source_url: string
          times_seen?: number
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          cited_urls?: Json
          claimed_morph?: string | null
          claimed_price_krw?: number
          claimed_sex?: string | null
          claimed_status?: string
          claimed_weight_g?: number | null
          created_at?: string
          evidence?: Json
          first_seen_at?: string
          hostname?: string
          id?: string
          last_checked_at?: string | null
          last_seen_at?: string
          model?: string
          model_confidence?: string
          page_http_status?: number | null
          platform_id?: string | null
          provider?: string
          rejection_reason?: string | null
          response_id?: string | null
          robots_status?: string
          search_query?: string
          source_url?: string
          times_seen?: number
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_evidence_candidates_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_locations: {
        Row: {
          coordinate_accuracy: string
          coordinate_source: string | null
          created_at: string
          evidence_url: string
          id: string
          inventory_scope: string
          is_active: boolean
          latitude: number | null
          location_type: string
          longitude: number | null
          name: string
          platform_id: string
          region_label: string
          road_address: string
          updated_at: string
          verified_at: string
          visit_policy: string
        }
        Insert: {
          coordinate_accuracy?: string
          coordinate_source?: string | null
          created_at?: string
          evidence_url: string
          id?: string
          inventory_scope?: string
          is_active?: boolean
          latitude?: number | null
          location_type: string
          longitude?: number | null
          name: string
          platform_id: string
          region_label: string
          road_address: string
          updated_at?: string
          verified_at: string
          visit_policy?: string
        }
        Update: {
          coordinate_accuracy?: string
          coordinate_source?: string | null
          created_at?: string
          evidence_url?: string
          id?: string
          inventory_scope?: string
          is_active?: boolean
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name?: string
          platform_id?: string
          region_label?: string
          road_address?: string
          updated_at?: string
          verified_at?: string
          visit_policy?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_locations_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      source_candidates: {
        Row: {
          created_at: string
          discovery_query: string
          discovery_title: string
          evidence: Json
          example_url: string
          first_seen_at: string
          hostname: string
          id: string
          last_checked_at: string | null
          last_seen_at: string
          platform_hint: string
          provider: string
          rejection_reason: string | null
          robots_status: string
          status: string
          times_seen: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discovery_query: string
          discovery_title?: string
          evidence?: Json
          example_url: string
          first_seen_at?: string
          hostname: string
          id?: string
          last_checked_at?: string | null
          last_seen_at?: string
          platform_hint?: string
          provider: string
          rejection_reason?: string | null
          robots_status?: string
          status?: string
          times_seen?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discovery_query?: string
          discovery_title?: string
          evidence?: Json
          example_url?: string
          first_seen_at?: string
          hostname?: string
          id?: string
          last_checked_at?: string | null
          last_seen_at?: string
          platform_hint?: string
          provider?: string
          rejection_reason?: string | null
          robots_status?: string
          status?: string
          times_seen?: number
          updated_at?: string
        }
        Relationships: []
      }
      source_discovery_runs: {
        Row: {
          candidates_upserted: number
          eligible_count: number
          error_message: string | null
          finished_at: string | null
          id: number
          model: string | null
          provider: string
          query_count: number
          results_seen: number
          search_calls: number
          source_urls_seen: number
          started_at: string
          status: string
          usage: Json
        }
        Insert: {
          candidates_upserted?: number
          eligible_count?: number
          error_message?: string | null
          finished_at?: string | null
          id?: never
          model?: string | null
          provider: string
          query_count?: number
          results_seen?: number
          search_calls?: number
          source_urls_seen?: number
          started_at?: string
          status?: string
          usage?: Json
        }
        Update: {
          candidates_upserted?: number
          eligible_count?: number
          error_message?: string | null
          finished_at?: string | null
          id?: never
          model?: string | null
          provider?: string
          query_count?: number
          results_seen?: number
          search_calls?: number
          source_urls_seen?: number
          started_at?: string
          status?: string
          usage?: Json
        }
        Relationships: []
      }
      traits: {
        Row: {
          aliases: Json
          created_at: string
          id: string
          is_filterable: boolean
          name_en: string | null
          name_ko: string
          slug: string
          trait_type: string
          updated_at: string
        }
        Insert: {
          aliases?: Json
          created_at?: string
          id?: string
          is_filterable?: boolean
          name_en?: string | null
          name_ko: string
          slug: string
          trait_type: string
          updated_at?: string
        }
        Update: {
          aliases?: Json
          created_at?: string
          id?: string
          is_filterable?: boolean
          name_en?: string | null
          name_ko?: string
          slug?: string
          trait_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_listing_observation: {
        Args: {
          p_bundle_count: number
          p_classification_source: string
          p_current_price: number
          p_external_id: string
          p_image_url: string
          p_morph_id: string
          p_observed_at?: string
          p_original_description: string
          p_original_title: string
          p_original_url: string
          p_platform_id: string
          p_price_type: string
          p_raw_data: Json
          p_sex: string
          p_status: string
          p_weight_g: number
        }
        Returns: string
      }
      configure_collector_scheduler: {
        Args: { p_collector_secret: string; p_project_url: string }
        Returns: boolean
      }
      invoke_openai_price_discovery: { Args: never; Returns: number }
      invoke_scheduled_collectors: {
        Args: { p_limit?: number }
        Returns: number[]
      }
      invoke_source_discovery: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
